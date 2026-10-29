import Foundation

public struct CommandEdit: Sendable {
    public var patch: SourcePatch
    public var selection: SourceRange
    public init(_ patch: SourcePatch, _ selection: SourceRange) { self.patch=patch; self.selection=selection }
}

public enum MarkdownCommands {
    public static func wrap(_ source:String, selection:SourceRange, marker:String, placeholder:String="text") -> CommandEdit {
        let ns=source as NSString;var r=selection
        if r.length==0 {
            // A caret inside an existing styled span toggles that entire span.
            let escaped=NSRegularExpression.escapedPattern(for:marker)
            let candidates: [(String,Int)]
            if marker=="*" || marker=="**" {
                candidates=[("(?<!\\*)\\*{3}([^\\n]+?)\\*{3}(?!\\*)",marker.count),("(?<!\\*)"+escaped+"(?!\\*)([^\\n]+?)"+escaped+"(?!\\*)",marker.count)]
            }else{candidates=[(escaped+"([^\\n]+?)"+escaped,marker.utf16.count)]}
            for (pattern,width) in candidates {
                if let regex=try? NSRegularExpression(pattern:pattern),let match=regex.matches(in:source,range:NSRange(location:0,length:ns.length)).first(where:{$0.range.location<=r.start && NSMaxRange($0.range)>=r.start}) {
                    let content=ns.substring(with:NSRange(location:match.range.location+width,length:match.range.length-width*2))
                    return .init(.init(.init(match.range.location,NSMaxRange(match.range)),content),.init(match.range.location,match.range.location+content.utf16.count))
                }
            }
            let word=try? NSRegularExpression(pattern:"[\\p{L}\\p{N}_]+")
            if let found=word?.matches(in:source,range:NSRange(location:0,length:ns.length)).first(where:{$0.range.location<=r.start && NSMaxRange($0.range)>=r.start}) {r = .init(found.range.location,NSMaxRange(found.range))}
        }
        let width=marker.utf16.count
        let beforeStars=ns.substring(to:r.start).reversed().prefix(while:{$0=="*"}).count,afterStars=ns.substring(from:r.end).prefix(while:{$0=="*"}).count
        let exactDelimiter=marker != "*" || (beforeStars%2==1 && afterStars%2==1)
        if exactDelimiter,r.start>=width,r.end+width<=ns.length,ns.substring(with:NSRange(location:r.start-width,length:width))==marker,ns.substring(with:NSRange(location:r.end,length:width))==marker {
            let text=ns.substring(with:r.nsRange);return .init(.init(.init(r.start-width,r.end+width),text),.init(r.start-width,r.end-width))
        }
        let text=r.length>0 ? ns.substring(with:r.nsRange):placeholder
        return .init(.init(r,marker+text+marker),.init(r.start+width,r.start+width+text.utf16.count))
    }
    public static func prefixLines(_ source:String,selection:SourceRange,prefix:String) -> CommandEdit {
        let ns=source as NSString;let lines=ns.lineRange(for:selection.nsRange)
        let old=ns.substring(with:lines);let newline=old.contains("\r\n") ? "\r\n":"\n"
        var rows=old.components(separatedBy:newline);let trailing=rows.last=="";if trailing{rows.removeLast()}
        let heading=try! NSRegularExpression(pattern:"^ {0,3}#{1,6} +")
        let result=rows.map { row in
            if prefix.hasPrefix("#") || prefix.isEmpty {return prefix+heading.stringByReplacingMatches(in:row,range:NSRange(location:0,length:row.utf16.count),withTemplate:"")}
            return row.hasPrefix(prefix) ? String(row.dropFirst(prefix.count)):prefix+row
        }.joined(separator:newline)+(trailing ? newline:"")
        return .init(.init(.init(lines.location,NSMaxRange(lines)),result),.init(lines.location,lines.location+result.utf16.count))
    }
    public static func insert(_ text:String, at range:SourceRange) -> CommandEdit {
        let caret=(text as NSString).range(of:"$0")
        let body=text.replacingOccurrences(of:"$0",with:"")
        let offset=caret.location==NSNotFound ? body.utf16.count:caret.location
        return .init(.init(range,body),.init(range.start+offset,range.start+offset))
    }
    public static func continueLine(_ source:String,selection:SourceRange)->CommandEdit? {
        guard selection.length==0 else{return nil};let ns=source as NSString
        let line=ns.lineRange(for:NSRange(location:selection.start,length:0));let before=ns.substring(with:NSRange(location:line.location,length:selection.start-line.location))
        let pattern="^(\\s*)(?:(- |\\* |\\+ )(\\[[ xX]\\] )?|(\\d+)[.)] |> )(.*)$"
        guard let regex=try? NSRegularExpression(pattern:pattern),let m=regex.firstMatch(in:before,range:NSRange(location:0,length:before.utf16.count)) else{return nil}
        func capture(_ i:Int)->String{m.range(at:i).location==NSNotFound ? "":(before as NSString).substring(with:m.range(at:i))}
        if capture(5).trimmingCharacters(in:.whitespaces).isEmpty {return .init(.init(.init(line.location,selection.start),""),.init(line.location,line.location))}
        let prefix:String
        if let number=Int(capture(4)){prefix=capture(1)+"\(number+1). "}
        else if !capture(2).isEmpty{prefix=capture(1)+capture(2)+(capture(3).isEmpty ? "":"[ ] ")}
        else{prefix=capture(1)+"> "}
        let text=(source.contains("\r\n") ? "\r\n":"\n")+prefix
        return .init(.init(selection,text),.init(selection.start+text.utf16.count,selection.start+text.utf16.count))
    }
    public static func format(_ source:String)->String {
        let newline=source.contains("\r\n") ? "\r\n":"\n";var fence:String?,math=false
        return source.components(separatedBy:newline).map { line in
            let trim=line.trimmingCharacters(in:.whitespaces)
            if trim.hasPrefix("```") || trim.hasPrefix("~~~") {let marker=String(trim.prefix(while:{$0=="`" || $0=="~"}));if let current=fence {if marker.first==current.first && marker.count>=current.count{fence=nil}}else{fence=marker};return line}
            if fence != nil{return line};if trim=="$$"{math.toggle();return line};if math{return line}
            if line.hasSuffix("  "){return line}
            return line.replacingOccurrences(of:"[ \\t]+$",with:"",options:.regularExpression)
        }.joined(separator:newline)
    }
}

public struct SearchOptions:Sendable {public var caseSensitive=false;public var wholeWord=false;public var regularExpression=false;public init(caseSensitive:Bool=false,wholeWord:Bool=false,regularExpression:Bool=false){self.caseSensitive=caseSensitive;self.wholeWord=wholeWord;self.regularExpression=regularExpression}}
public enum DocumentSearch {
    public static func expression(_ query:String,options:SearchOptions)throws->NSRegularExpression {
        var pattern=options.regularExpression ? query:NSRegularExpression.escapedPattern(for:query)
        if options.wholeWord{pattern="(?<![\\p{L}\\p{N}_])(?:"+pattern+")(?![\\p{L}\\p{N}_])"}
        return try NSRegularExpression(pattern:pattern,options:options.caseSensitive ? []:[.caseInsensitive])
    }
    public static func matches(_ source:String,query:String,options:SearchOptions)throws->[SourceRange]{
        guard !query.isEmpty else{return []};return try expression(query,options:options).matches(in:source,range:NSRange(location:0,length:source.utf16.count)).map{.init($0.range.location,NSMaxRange($0.range))}
    }
    public static func replacements(_ source:String,query:String,replacement:String,options:SearchOptions)throws->[SourcePatch]{
        guard !query.isEmpty else{return []};let regex=try expression(query,options:options)
        return regex.matches(in:source,range:NSRange(location:0,length:source.utf16.count)).map{m in .init(.init(m.range.location,NSMaxRange(m.range)),options.regularExpression ? regex.replacementString(for:m,in:source,offset:0,template:replacement):replacement)}
    }
}
