import AppKit

@MainActor enum RichTextCodec {
    /// AppKit's plain RTF writer omits attachments. Preserve them using standard
    /// RTF picture groups after AppKit serializes all text styling and Unicode.
    static func rtf(from rich:NSAttributedString)throws->Data{
        let copy=NSMutableAttributedString(attributedString:rich)
        var images:[(NSRange,String,String)]=[];var missingImage=false
        rich.enumerateAttribute(.attachment,in:NSRange(location:0,length:rich.length)){value,range,_ in
            guard let attachment=value as? NSTextAttachment else{return}
            let data=attachment.fileWrapper?.regularFileContents ?? attachment.contents
            let image=attachment.image ?? data.flatMap{NSImage(data:$0)}
            guard let image,let tiff=image.tiffRepresentation,let rep=NSBitmapImageRep(data:tiff),let png=rep.representation(using:.png,properties:[:]) else{missingImage=true;return}
            let token="REMARQUEIMAGE"+UUID().uuidString.replacingOccurrences(of:"-",with:"")
            let width=max(1,Int(image.size.width*20)),height=max(1,Int(image.size.height*20))
            let hex=png.map{String(format:"%02x",$0)}.joined()
            let pict="{\\pict\\pngblip\\picw\(rep.pixelsWide)\\pich\(rep.pixelsHigh)\\picwgoal\(width)\\pichgoal\(height)\n\(hex)}"
            images.append((range,token,pict))
        }
        if missingImage{throw NSError(domain:"Remarque",code:1,userInfo:[NSLocalizedDescriptionKey:"An embedded image could not be encoded. The RTF export was stopped to avoid losing it."])}
        for (range,token,_) in images.reversed(){copy.replaceCharacters(in:range,with:token)}
        let data=try copy.data(from:NSRange(location:0,length:copy.length),documentAttributes:[.documentType:NSAttributedString.DocumentType.rtf])
        guard var text=String(data:data,encoding:.utf8) else{throw CocoaError(.fileWriteInapplicableStringEncoding)}
        for (_,token,pict) in images{text=text.replacingOccurrences(of:token,with:pict)}
        return Data(text.utf8)
    }
    static func html(fromRTF data:Data)throws->String{
        // Extract common hex PNG/JPEG picture groups before AppKit's RTF reader,
        // which otherwise loses embedded graphics in plain .rtf documents.
        var raw=String(data:data,encoding:.utf8) ?? String(data:data,encoding:.isoLatin1) ?? ""
        let regex=try NSRegularExpression(pattern:#"\{\\pict[\s\S]*?\}"#)
        var replacements:[String:String]=[:]
        let ns=raw as NSString
        for match in regex.matches(in:raw,range:NSRange(location:0,length:ns.length)).reversed(){
            let group=ns.substring(with:match.range),mime=group.contains("\\pngblip") ? "image/png":group.contains("\\jpegblip") ? "image/jpeg":nil
            guard let mime,let start=group.range(of:#"[0-9a-fA-F]{32}"#,options:.regularExpression) else{continue}
            let hex=group[start.lowerBound...].filter{$0.isHexDigit};guard hex.count<=40_000_000,hex.count%2==0 else{continue}
            var bytes=Data();var index=hex.startIndex
            while index<hex.endIndex{let end=hex.index(index,offsetBy:2);guard let byte=UInt8(hex[index..<end],radix:16) else{break};bytes.append(byte);index=end}
            let token="REMARQUEIMPORTEDIMAGE"+UUID().uuidString.replacingOccurrences(of:"-",with:"")
            replacements[token]="<img alt=\"Imported image\" src=\"data:\(mime);base64,\(bytes.base64EncodedString())\">"
            raw=(raw as NSString).replacingCharacters(in:match.range,with:token)
        }
        let rich=try NSAttributedString(data:Data(raw.utf8),options:[.documentType:NSAttributedString.DocumentType.rtf],documentAttributes:nil)
        let html=try rich.data(from:NSRange(location:0,length:rich.length),documentAttributes:[.documentType:NSAttributedString.DocumentType.html])
        var text=String(data:html,encoding:.utf8) ?? rich.string
        for (token,image) in replacements{text=text.replacingOccurrences(of:token,with:image)}
        return text
    }
}
