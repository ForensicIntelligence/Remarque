import XCTest
@testable import RemarqueCore
final class HistoryTests:XCTestCase {
    func testSnapshotDeduplicationAndProtectedRecovery()async throws{
        let directory=FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString);defer{try? FileManager.default.removeItem(at:directory)}
        let store=HistoryStore(root:directory)
        try await store.capture(key:"/note.md",text:"original\r\n")
        try await store.capture(key:"/note.md",text:"original\r\n")
        var entries=try await store.list(key:"/note.md");XCTAssertEqual(entries.count,1)
        try await store.capture(key:"/note.md",text:"edited",manual:true,label:"Before Restore")
        entries=try await store.list(key:"/note.md");XCTAssertEqual(entries.count,2);XCTAssertTrue(entries[0].manual)
        let original=try await store.text(key:"/note.md",id:entries[1].id);XCTAssertEqual(original,"original\r\n")
        let entry=RecoveryEntry(id:UUID().uuidString,filePath:nil,source:"unsaved 📝",selection:.init(0,0));try await store.journal(entry)
        let recovery=try await store.recoveries();XCTAssertEqual(recovery.first?.source,"unsaved 📝")
        try await store.removeRecovery(entry.id);let empty=try await store.recoveries();XCTAssertTrue(empty.isEmpty)
    }
}
