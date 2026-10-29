import XCTest
@testable import RemarqueCore
final class EditingTests:XCTestCase {
    func testSmartContinuationAndExit(){
        XCTAssertEqual(MarkdownCommands.continueLine("  - [x] Done",selection:.init(12,12))?.patch.text,"\n  - [ ] ")
        XCTAssertEqual(MarkdownCommands.continueLine("9. Item",selection:.init(7,7))?.patch.text,"\n10. ")
        XCTAssertEqual(MarkdownCommands.continueLine("- ",selection:.init(2,2))?.patch,.init(.init(0,2),""))
    }
    func testCaretStyleToggle(){
        XCTAssertEqual(MarkdownCommands.wrap("Some **bold** text",selection:.init(9,9),marker:"**").patch,.init(.init(5,13),"bold"))
        XCTAssertEqual(MarkdownCommands.wrap("A word.",selection:.init(4,4),marker:"**").patch,.init(.init(2,6),"**word**"))
    }
    func testRegexReplaceAndUnicode(){
        let patches=try! DocumentSearch.replacements("café1 café2",query:"café(\\d)",replacement:"note$1",options:.init(regularExpression:true))
        var engine=DocumentEngine("café1 café2");try! engine.apply(patches,baseRevision:0);XCTAssertEqual(engine.text,"note1 note2");try! engine.undo();XCTAssertEqual(engine.text,"café1 café2")
    }
    func testFormatterPreservesLiteralBodiesAndHardBreaks(){
        let text="# Title  \n\n```swift\nlet x = 1   \n```\n\n$$\nx   \n$$\nDone \t\n"
        XCTAssertEqual(MarkdownCommands.format(text),"# Title  \n\n```swift\nlet x = 1   \n```\n\n$$\nx   \n$$\nDone\n")
    }
}

extension EditingTests {
    func testNestedBoldItalicCaretTogglesDoNotConsumeTheOtherStyle(){
        XCTAssertEqual(MarkdownCommands.wrap("***word***",selection:.init(5,5),marker:"*").patch.text,"**word**")
        XCTAssertEqual(MarkdownCommands.wrap("***word***",selection:.init(5,5),marker:"**").patch.text,"*word*")
        XCTAssertEqual(MarkdownCommands.wrap("**word**",selection:.init(4,4),marker:"*").patch.text,"*word*")
    }
}
