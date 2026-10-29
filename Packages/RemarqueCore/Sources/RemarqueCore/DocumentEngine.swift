import Foundation
import CryptoKit

public struct SourceRange: Codable, Equatable, Sendable {
    public var start: Int
    public var end: Int
    public init(_ start: Int, _ end: Int) { self.start = start; self.end = end }
    public var length: Int { end - start }
    public var nsRange: NSRange { NSRange(location: start, length: max(0, length)) }
}

public struct SourcePatch: Codable, Equatable, Sendable {
    public var range: SourceRange
    public var text: String
    public init(_ range: SourceRange, _ text: String) { self.range = range; self.text = text }
}

public struct EditorSelection: Codable, Equatable, Sendable {
    public var range: SourceRange
    public var surface: String
    public init(_ range: SourceRange = .init(0, 0), surface: String = "source") { self.range = range; self.surface = surface }
}

public enum DocumentError: Error, LocalizedError, Equatable {
    case invalidUTF8, invalidRange, overlappingPatches, staleRevision(expected: Int, received: Int)
    public var errorDescription: String? {
        switch self {
        case .invalidUTF8: "This file is not valid UTF-8. The original file has not been changed."
        case .invalidRange: "The edit points outside the document or splits a Unicode character."
        case .overlappingPatches: "The edit contains overlapping source changes."
        case let .staleRevision(expected, received): "The edit uses revision \(received); the document is at \(expected)."
        }
    }
}

/// Immutable text segments preserve byte-for-byte trivia and mixed line endings.
/// Offsets crossing the UI boundary are always UTF-16, never Swift character counts.
public struct SourceBuffer: Sendable {
    private var pieces: [String]
    public private(set) var count: Int
    public init(_ text: String = "") { pieces = [text]; count = text.utf16.count }
    public init(data: Data) throws {
        // Decode scalars without Foundation's OS-dependent BOM handling. Every
        // leading/interior BOM is source trivia and must survive byte-for-byte.
        guard let decoded = String(validating: data, as: UTF8.self) else { throw DocumentError.invalidUTF8 }
        self.init(decoded)
    }
    public var text: String { pieces.joined() }
    public var data: Data { Data(text.utf8) }
    public func slice(_ range: SourceRange) throws -> String {
        guard range.start >= 0, range.end >= range.start, range.end <= count else { throw DocumentError.invalidRange }
        var offset = 0
        var result = ""
        for piece in pieces {
            let size = piece.utf16.count
            let lo = max(0, range.start - offset), hi = min(size, range.end - offset)
            if hi > lo {
                guard let r = Range(NSRange(location: lo, length: hi - lo), in: piece) else { throw DocumentError.invalidRange }
                result += piece[r]
            }
            offset += size
            if offset >= range.end { break }
        }
        return result
    }
    public func isScalarBoundary(_ offset: Int) -> Bool {
        guard offset >= 0, offset <= count else { return false }
        var start = 0
        for piece in pieces {
            let n = piece.utf16.count
            if offset <= start + n {
                return String.Index(utf16Offset: offset - start, in: piece).samePosition(in: piece.unicodeScalars) != nil
            }
            start += n
        }
        return offset == count
    }
    public mutating func replace(_ patch: SourcePatch) throws {
        guard patch.range.start >= 0, patch.range.end >= patch.range.start, patch.range.end <= count,
              isScalarBoundary(patch.range.start), isScalarBoundary(patch.range.end) else { throw DocumentError.invalidRange }
        var next: [String] = [], offset = 0, inserted = false
        for piece in pieces {
            let size = piece.utf16.count, end = offset + size
            if end <= patch.range.start { next.append(piece) }
            else if offset >= patch.range.end {
                if !inserted { next.append(patch.text); inserted = true }
                next.append(piece)
            } else {
                let ns = piece as NSString
                if patch.range.start > offset { next.append(ns.substring(to: patch.range.start - offset)) }
                if !inserted { next.append(patch.text); inserted = true }
                if patch.range.end < end { next.append(ns.substring(from: patch.range.end - offset)) }
            }
            offset = end
        }
        if !inserted { next.append(patch.text) }
        pieces = next.filter { !$0.isEmpty }
        count += patch.text.utf16.count - patch.range.length
        if pieces.count > 256 { pieces = [pieces.joined()] }
    }
}

public struct DocumentChange: Sendable {
    public let revision: Int
    public let patches: [SourcePatch]
    public let selection: EditorSelection
    public let label: String
}

public struct DocumentEngine: Sendable {
    private struct UndoUnit: Sendable {
        var forward: [[SourcePatch]]
        var inverse: [[SourcePatch]]
        var before: EditorSelection
        var after: EditorSelection
        var label: String
        var group: String?
    }
    public private(set) var buffer: SourceBuffer
    public private(set) var revision = 0
    public private(set) var selection = EditorSelection()
    private var savedDigest: String
    private var undoUnits: [UndoUnit] = []
    private var redoUnits: [UndoUnit] = []
    public init(_ text: String = "") { buffer = SourceBuffer(text); savedDigest = Self.digest(text) }
    public init(data: Data) throws { let b = try SourceBuffer(data: data); self.init(b.text) }
    public var text: String { buffer.text }
    public var canUndo: Bool { !undoUnits.isEmpty }
    public var canRedo: Bool { !redoUnits.isEmpty }
    public var undoLabel: String { undoUnits.last?.label ?? "" }
    public var redoLabel: String { redoUnits.last?.label ?? "" }
    public var isDirty: Bool { Self.digest(text) != savedDigest }
    public mutating func markSaved(_ savedText: String? = nil) { savedDigest = Self.digest(savedText ?? text) }
    public func isSavedVersion(_ text:String)->Bool{Self.digest(text)==savedDigest}
    public mutating func reload(_ text:String){buffer=SourceBuffer(text);revision+=1;savedDigest=Self.digest(text);undoUnits.removeAll();redoUnits.removeAll();select(selection)}
    public mutating func select(_ new: EditorSelection) {
        let lo = min(max(0, new.range.start), buffer.count), hi = min(max(0, new.range.end), buffer.count)
        selection = .init(.init(min(lo, hi), max(lo, hi)), surface: new.surface)
    }
    public static func digest(_ text: String) -> String { SHA256.hash(data: Data(text.utf8)).map { String(format: "%02x", $0) }.joined() }
    @discardableResult public mutating func apply(_ patches: [SourcePatch], baseRevision: Int, selection after: EditorSelection? = nil, label: String = "Edit", group: String? = nil) throws -> DocumentChange {
        guard baseRevision == revision else { throw DocumentError.staleRevision(expected: revision, received: baseRevision) }
        let sorted = patches.sorted { $0.range.start < $1.range.start }
        for (i, p) in sorted.enumerated() {
            guard p.range.start >= 0, p.range.end >= p.range.start, p.range.end <= buffer.count,
                  buffer.isScalarBoundary(p.range.start), buffer.isScalarBoundary(p.range.end) else { throw DocumentError.invalidRange }
            if i > 0 && (sorted[i - 1].range.end > p.range.start || sorted[i - 1].range.start == p.range.start) { throw DocumentError.overlappingPatches }
        }
        var delta = 0, inverse: [SourcePatch] = []
        for p in sorted {
            let original = try buffer.slice(p.range)
            inverse.append(.init(.init(p.range.start + delta, p.range.start + delta + p.text.utf16.count), original))
            delta += p.text.utf16.count - p.range.length
        }
        let before = selection
        var next = buffer
        for p in sorted.reversed() { try next.replace(p) }
        buffer = next; revision += 1
        select(after ?? .init(.init(min(buffer.count, selection.range.start), min(buffer.count, selection.range.end)), surface: selection.surface))
        let unit = UndoUnit(forward: [sorted], inverse: [inverse], before: before, after: selection, label: label, group: group)
        if let group, undoUnits.last?.group == group {
            undoUnits[undoUnits.count - 1].forward += unit.forward
            undoUnits[undoUnits.count - 1].inverse += unit.inverse
            undoUnits[undoUnits.count - 1].after = selection
        } else { undoUnits.append(unit) }
        redoUnits.removeAll()
        return .init(revision: revision, patches: sorted, selection: selection, label: label)
    }
    @discardableResult public mutating func undo() throws -> DocumentChange? {
        guard let unit = undoUnits.last else { return nil }
        var next = buffer
        for batch in unit.inverse.reversed() { for p in batch.reversed() { try next.replace(p) } }
        undoUnits.removeLast(); buffer = next; revision += 1; select(unit.before); redoUnits.append(unit)
        return .init(revision: revision, patches: [], selection: selection, label: unit.label)
    }
    @discardableResult public mutating func redo() throws -> DocumentChange? {
        guard let unit = redoUnits.last else { return nil }
        var next = buffer
        for batch in unit.forward { for p in batch.reversed() { try next.replace(p) } }
        redoUnits.removeLast(); buffer = next; revision += 1; select(unit.after); undoUnits.append(unit)
        return .init(revision: revision, patches: [], selection: selection, label: unit.label)
    }
    public static func minimalPatch(from old: String, to new: String) -> SourcePatch {
        let a = Array(old.utf16), b = Array(new.utf16)
        var prefix = 0
        while prefix < min(a.count, b.count), a[prefix] == b[prefix] { prefix += 1 }
        while prefix > 0, prefix < a.count, (0xDC00...0xDFFF).contains(a[prefix]) { prefix -= 1 }
        var suffix = 0
        while suffix < a.count - prefix, suffix < b.count - prefix, a[a.count - suffix - 1] == b[b.count - suffix - 1] { suffix += 1 }
        if suffix > 0, a.count - suffix < a.count, (0xDC00...0xDFFF).contains(a[a.count - suffix]) { suffix -= 1 }
        return .init(.init(prefix, a.count - suffix), (new as NSString).substring(with: NSRange(location: prefix, length: b.count - prefix - suffix)))
    }
}
