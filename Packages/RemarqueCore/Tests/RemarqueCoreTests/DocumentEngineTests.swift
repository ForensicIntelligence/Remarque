import XCTest
@testable import RemarqueCore

final class DocumentEngineTests: XCTestCase {
    func testNoOpRoundTripPreservesUTF8BOMAndMixedNewlines() throws {
        let text = "\u{FEFF}---\r\ntitle: Test\n---\r\n\n__é__ 👩🏽‍💻\r\n<!-- unknown: keep -->"
        var d = try DocumentEngine(data: Data(text.utf8))
        XCTAssertEqual(d.buffer.data, Data(text.utf8)); XCTAssertFalse(d.isDirty)
        d.select(.init(.init(2, 2), surface: "rendered")); XCTAssertFalse(d.isDirty)
    }
    func testInvalidEncodingRejectedAndEmptyAccepted() throws {
        XCTAssertThrowsError(try DocumentEngine(data: Data([0xff, 0xfe])))
        XCTAssertEqual(try DocumentEngine(data: Data()).text, "")
    }
    func testPatchAndUndoExactAcrossPanes() throws {
        var d = DocumentEngine("# Same\n\n**word**\n\n# Same\n")
        try d.apply([.init(.init(10, 14), "edit")], baseRevision: 0, selection: .init(.init(14, 14), surface: "rendered"))
        try d.apply([.init(.init(2, 6), "First")], baseRevision: 1, selection: .init(.init(7, 7)))
        XCTAssertEqual(d.text, "# First\n\n**edit**\n\n# Same\n")
        try d.undo(); try d.undo(); XCTAssertEqual(d.text, "# Same\n\n**word**\n\n# Same\n"); XCTAssertFalse(d.isDirty)
        try d.redo(); try d.redo(); XCTAssertEqual(d.text, "# First\n\n**edit**\n\n# Same\n")
    }
    func testStaleAndOverlappingEditsAreAtomic() throws {
        var d = DocumentEngine("abcdef")
        XCTAssertThrowsError(try d.apply([.init(.init(0, 1), "x")], baseRevision: 7))
        XCTAssertThrowsError(try d.apply([.init(.init(0, 3), "x"), .init(.init(2, 4), "y")], baseRevision: 0))
        XCTAssertEqual(d.text, "abcdef"); XCTAssertEqual(d.revision, 0)
    }
    func testRejectSurrogateSplit() throws {
        var d = DocumentEngine("A😀Z")
        XCTAssertThrowsError(try d.apply([.init(.init(2, 3), "!")], baseRevision: 0))
        XCTAssertEqual(d.text, "A😀Z")
        try d.apply([.init(.init(1, 3), "👩🏽‍💻")], baseRevision: 0)
        XCTAssertEqual(d.text, "A👩🏽‍💻Z"); try d.undo(); XCTAssertEqual(d.text, "A😀Z")
    }
    func testMultiplePatchesAndGrouping() throws {
        var d = DocumentEngine("abc def ghi")
        try d.apply([.init(.init(0, 3), "ABCD"), .init(.init(8, 11), "G")], baseRevision: 0, group: "typing")
        try d.apply([.init(.init(10, 10), "!")], baseRevision: 1, group: "typing")
        let final = d.text; try d.undo(); XCTAssertEqual(d.text, "abc def ghi")
        XCTAssertFalse(d.canUndo); try d.redo(); XCTAssertEqual(d.text, final)
    }
    func testMinimalPatchDoesNotSplitEmoji() throws {
        let cases = [("A😀Z", "A😁Z"), ("👩🏽‍💻 ok", "👩🏻‍💻 ok"), ("abc", ""), ("", "abc"), ("ab\r\nc", "ab\r\ncat")]
        for (a, b) in cases {
            var d = DocumentEngine(a); try d.apply([DocumentEngine.minimalPatch(from: a, to: b)], baseRevision: 0)
            XCTAssertEqual(d.text, b); try d.undo(); XCTAssertEqual(d.text, a)
        }
    }
    func testRandomizedInsertDeleteUndoRedo() throws {
        var d = DocumentEngine("# Seed\r\n\nOriginal **text**")
        let initial = d.text
        var seed: UInt64 = 38
        for i in 0..<200 {
            seed = seed &* 6364136223846793005 &+ 1
            let offset = Int(seed % UInt64(d.buffer.count + 1))
            let end = min(offset + (i % 3 == 0 ? 1 : 0), d.buffer.count)
            try d.apply([.init(.init(offset, end), "x\(i)")], baseRevision: d.revision)
        }
        let result = d.text
        for _ in 0..<200 { try d.undo() }; XCTAssertEqual(d.text, initial)
        for _ in 0..<200 { try d.redo() }; XCTAssertEqual(d.text, result)
    }
}

extension DocumentEngineTests {
    func testReloadKeepsMonotonicRevisionAndSavedBaseline() throws {
        var engine=DocumentEngine("Old")
        try engine.apply([.init(.init(3,3)," draft")],baseRevision:0)
        engine.reload("External")
        XCTAssertEqual(engine.revision,2)
        XCTAssertFalse(engine.isDirty)
        XCTAssertTrue(engine.isSavedVersion("External"))
        XCTAssertNil(try engine.undo())
        XCTAssertThrowsError(try engine.apply([.init(.init(0,0),"Stale")],baseRevision:1))
    }
}
