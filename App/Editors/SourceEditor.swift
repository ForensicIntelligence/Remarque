import AppKit
import SwiftUI
import RemarqueCore

@MainActor final class SourceTextView: NSTextView {
    weak var session: DocumentSession?
    override func keyDown(with event: NSEvent) {
        if event.modifierFlags.contains(.command), event.charactersIgnoringModifiers == "z" {
            if event.modifierFlags.contains(.shift) { session?.redo() } else { session?.undo() }; return
        }
        super.keyDown(with:event)
    }
}

struct SourceEditor: NSViewRepresentable {
    @ObservedObject var session: DocumentSession
    func makeCoordinator() -> Coordinator { Coordinator(session) }
    func makeNSView(context: Context) -> NSScrollView {
        let scroll=NSScrollView();scroll.hasVerticalScroller=true;scroll.autohidesScrollers=true;scroll.borderType = .noBorder
        let text=SourceTextView(frame:.zero);text.session=session;text.isRichText=false;text.importsGraphics=false;text.allowsUndo=false
        text.isVerticallyResizable=true;text.isHorizontallyResizable=false;text.autoresizingMask = [.width]
        text.textContainer?.widthTracksTextView=true;text.textContainer?.containerSize=NSSize(width:0,height:CGFloat.greatestFiniteMagnitude)
        text.font = .monospacedSystemFont(ofSize:session.sourceSize,weight:.regular)
        text.textContainerInset=NSSize(width:22,height:22);text.backgroundColor = .textBackgroundColor;text.textColor = .textColor
        text.isAutomaticQuoteSubstitutionEnabled=false;text.isAutomaticDashSubstitutionEnabled=false
        text.isAutomaticTextReplacementEnabled=false;text.isContinuousSpellCheckingEnabled=true
        text.usesFindBar=true;text.setAccessibilityLabel("Markdown source editor");text.setAccessibilityIdentifier("sourceEditor")
        text.string=session.source;text.delegate=context.coordinator
        context.coordinator.textView=text;scroll.documentView=text
        session.revealSource = { [weak text, weak coordinator=context.coordinator] range in
            guard let text, let coordinator, range.location+range.length <= (text.string as NSString).length else{return}
            coordinator.updating=true;text.setSelectedRange(range);text.scrollRangeToVisible(range);coordinator.updating=false
        }
        return scroll
    }
    func updateNSView(_ scroll: NSScrollView, context: Context) {
        guard let text=scroll.documentView as? SourceTextView else{return}
        let c=context.coordinator;c.updating=true;defer{c.updating=false}
        text.font = .monospacedSystemFont(ofSize:session.sourceSize,weight:.regular)
        if text.string != session.source && !text.hasMarkedText() {
            let selected=text.selectedRange();text.string=session.source
            let range=session.selection.surface == "source" ? session.selection.range.nsRange : selected
            let n=(text.string as NSString).length;text.setSelectedRange(NSRange(location:min(range.location,n),length:min(range.length,max(0,n-range.location))))
        }
    }
    @MainActor final class Coordinator: NSObject, NSTextViewDelegate {
        let session:DocumentSession
        weak var textView:SourceTextView?
        var updating=false
        init(_ session:DocumentSession){self.session=session}
        func textDidChange(_ notification:Notification){guard !updating,let t=textView,!t.hasMarkedText() else{return};session.replaceSource(t.string,selection:t.selectedRange())}
        func textViewDidChangeSelection(_ notification:Notification){
            guard !updating,let t=textView,t.window?.firstResponder===t else{return}
            DispatchQueue.main.async { [weak self,weak t] in
                guard let self,let t,!self.updating,t.window?.firstResponder===t else{return}
                let r=t.selectedRange();self.session.select(.init(r.location,r.location+r.length),surface:"source")
            }
        }
    }
}
