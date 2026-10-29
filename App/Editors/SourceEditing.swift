import AppKit
import RemarqueCore

extension SourceTextView {
    func apply(_ edit:CommandEdit){
        guard let session else{return}
        session.apply([edit.patch],selection:.init(edit.selection),label:"Edit",group:session.group(for:"source"))
        string=session.source;setSelectedRange(edit.selection.nsRange);scrollRangeToVisible(edit.selection.nsRange)
    }
    func smartKey(_ event:NSEvent)->Bool {
        let prefs=Preferences.shared.values;guard prefs.smartEditing,let session,!hasMarkedText(),event.modifierFlags.intersection([.command,.control,.option]).isEmpty else{return false}
        let r=selectedRange(),range=SourceRange(r.location,NSMaxRange(r)),ns=string as NSString
        if event.keyCode==36,let edit=MarkdownCommands.continueLine(string,selection:range){apply(edit);return true}
        if event.keyCode==48 {
            let line=ns.lineRange(for:r),before=ns.substring(with:NSRange(location:line.location,length:r.location-line.location))
            if !event.modifierFlags.contains(.shift),let snippet=prefs.snippets.first(where:{!$0.trigger.isEmpty && before.hasSuffix($0.trigger) && (before.count==$0.trigger.count || before.dropLast($0.trigger.count).last?.isWhitespace==true)}){
                session.insertSnippet(snippet,range:.init(r.location-snippet.trigger.utf16.count,NSMaxRange(r)));return true
            }
            if prefs.smartHeadings,r.length==0,r.location==line.location {
                let row=ns.substring(with:line);let level=row.prefix(while:{$0=="#"}).count
                let next=level<3 ? level+1:0;apply(MarkdownCommands.prefixLines(string,selection:range,prefix:String(repeating:"#",count:next)+(next>0 ? " ":"")));return true
            }
            if before.range(of:"^\\s*(?:[-*+] |[0-9]+[.)] )",options:.regularExpression) != nil {
                if event.modifierFlags.contains(.shift){let n=min(2,ns.substring(with:line).prefix(while:{$0==" "}).count);if n>0{apply(.init(.init(.init(line.location,line.location+n),""),.init(max(line.location,r.location-n),max(line.location,NSMaxRange(r)-n))))}}
                else {apply(.init(.init(.init(line.location,line.location),"  "),.init(r.location+2,NSMaxRange(r)+2)))}
                return true
            }
        }
        if prefs.pairBrackets,let key=event.characters,key.count==1 {
            let pairs=["(":")","[":"]","{":"}","\"":"\"","'":"'","`":"`"]
            if let close=pairs[key] {
                if ["'","\""].contains(key),r.length==0,r.location>0,ns.substring(with:NSRange(location:r.location-1,length:1)).rangeOfCharacter(from:.alphanumerics) != nil{return false}
                let selected=ns.substring(with:r)
                apply(.init(.init(range,key+selected+close),.init(r.location+1,NSMaxRange(r)+1)));return true
            }
            if [")","]","}"].contains(key),r.length==0,r.location<ns.length,ns.substring(with:NSRange(location:r.location,length:1))==key {setSelectedRange(NSRange(location:r.location+1,length:0));return true}
        }
        return false
    }
    func highlightSyntax(){
        guard let storage=textStorage else{return};let prefs=Preferences.shared.values
        let all=NSRange(location:0,length:storage.length)
        let base=NSFont(name:prefs.editorFont,size:prefs.editorSize) ?? .monospacedSystemFont(ofSize:prefs.editorSize,weight:.regular)
        let paragraph=NSMutableParagraphStyle();paragraph.lineHeightMultiple=prefs.lineSpacing
        storage.beginEditing();storage.setAttributes([.font:base,.foregroundColor:NSColor.textColor,.paragraphStyle:paragraph],range:all)
        func color(_ pattern:String,_ color:NSColor){guard let regex=try? NSRegularExpression(pattern:pattern,options:[.anchorsMatchLines]) else{return};for m in regex.matches(in:string,range:all){storage.addAttribute(.foregroundColor,value:color,range:m.range)}}
        color("^ {0,3}#{1,6} .*$",.systemBlue);color("\\*\\*[^\\n]+?\\*\\*|__[^\\n]+?__",.systemPurple)
        color("!?\\[[^\\n]*?\\]\\([^\\n]*?\\)",.systemTeal);color("^\\s*(?:[-*+] |[0-9]+[.)] |>|```|~~~).*$",.secondaryLabelColor)
        color("`[^`\\n]+`|\\$[^$\\n]+\\$",.systemOrange);color("^<!--.*-->$",.tertiaryLabelColor)
        if prefs.currentLine {let r=(string as NSString).lineRange(for:selectedRange());if r.length>0{storage.addAttribute(.backgroundColor,value:NSColor.controlAccentColor.withAlphaComponent(0.055),range:r)}}
        if session?.focusMode==true,prefs.dimInactive{
            let current=(string as NSString).paragraphRange(for:selectedRange())
            if current.location>0{storage.addAttribute(.foregroundColor,value:NSColor.textColor.withAlphaComponent(0.35),range:NSRange(location:0,length:current.location))}
            let end=NSMaxRange(current);if end<storage.length{storage.addAttribute(.foregroundColor,value:NSColor.textColor.withAlphaComponent(0.35),range:NSRange(location:end,length:storage.length-end))}
        }
        storage.endEditing();typingAttributes=[.font:base,.foregroundColor:NSColor.textColor,.paragraphStyle:paragraph]
    }
}
