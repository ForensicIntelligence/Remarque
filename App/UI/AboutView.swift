import AppKit
import SwiftUI

struct AboutView:View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isActive=false

    var body:some View {
        ScrollView {
            VStack(spacing:0) {
                TimelineView(.animation(minimumInterval:1.0/24,paused:reduceMotion || !isActive)) { context in
                    RemarqueFriends(time:reduceMotion ? 0:context.date.timeIntervalSinceReferenceDate)
                }
                .frame(height:230)
                .accessibilityHidden(true)

                Text("Remarque")
                    .font(.system(size:40,weight:.bold,design:.rounded))
                    .tracking(-1.2)
                Text("Markdown. Beautifully refined.")
                    .font(.system(size:15)).foregroundStyle(.secondary).padding(.top,8)
                Text("Version \(BuildInfo.label)")
                    .font(.system(size:12,weight:.medium,design:.monospaced))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal,14).padding(.vertical,7)
                    .background(.quaternary.opacity(0.45),in:Capsule())
                    .padding(.top,16)

                HStack(spacing:22) {
                    feature("Markdown",symbol:"text.alignleft")
                    feature("Mermaid",symbol:"point.3.connected.trianglepath.dotted")
                    feature("LaTeX",symbol:"function")
                }.padding(.top,28)

                Divider().padding(.horizontal,48).padding(.top,26)
                HStack(spacing:24) {
                    Button{AppWindows.shared.help()}label:{Label("Explore the guide",systemImage:"book.closed")}
                        .buttonStyle(.link)
                    Link(destination:URL(string:"https://forensicintelligence.ca")!){Label("Our website",systemImage:"arrow.up.right")}
                }.font(.system(size:12,weight:.medium)).padding(.top,22)
                Text("Made with care by Forensic Intelligence")
                    .font(.system(size:12)).foregroundStyle(.secondary).padding(.top,24)
                Text("© 2026 FI Forensic Intelligence, Ltd.")
                    .font(.system(size:10)).foregroundStyle(.secondary).padding(.top,6)
            }
            .frame(maxWidth:.infinity)
            .padding(.bottom,26)
        }
        .background(Color(nsColor:.windowBackgroundColor))
        .onAppear{updateActivity()}
        .onReceive(NotificationCenter.default.publisher(for:NSWindow.didBecomeKeyNotification)){_ in updateActivity()}
        .onReceive(NotificationCenter.default.publisher(for:NSWindow.didResignKeyNotification)){notification in
            if (notification.object as? NSWindow)?.identifier?.rawValue=="about"{isActive=false}
        }
        .onReceive(NotificationCenter.default.publisher(for:NSWindow.willCloseNotification)){notification in
            if (notification.object as? NSWindow)?.identifier?.rawValue=="about"{isActive=false}
        }
        .onReceive(NotificationCenter.default.publisher(for:NSApplication.didResignActiveNotification)){_ in isActive=false}
        .onReceive(NotificationCenter.default.publisher(for:NSApplication.didBecomeActiveNotification)){_ in updateActivity()}
        .onDisappear{isActive=false}
    }

    private func updateActivity(){isActive=NSApp.isActive && NSApp.keyWindow?.identifier?.rawValue=="about"}
    private func feature(_ title:String,symbol:String)->some View {
        Label(title,systemImage:symbol).font(.system(size:12,weight:.medium)).foregroundStyle(.secondary)
    }
}

/// The existing icon becomes three small paper companions. All motion stays in
/// this decorative area; Reduce Motion gives it a completely stationary pose.
private struct RemarqueFriends:View {
    let time:TimeInterval
    var body:some View {
        GeometryReader { geometry in
            let width=geometry.size.width
            ZStack {
                Ellipse().fill(Color.cyan.opacity(0.10)).frame(width:360,height:155).blur(radius:24)
                    .position(x:width/2,y:132)
                Path { path in
                    path.move(to:CGPoint(x:width*0.18,y:145))
                    path.addCurve(to:CGPoint(x:width*0.82,y:157),control1:CGPoint(x:width*0.35,y:222),control2:CGPoint(x:width*0.63,y:60))
                }.stroke(Color.accentColor.opacity(0.16),style:StrokeStyle(lineWidth:1.5,dash:[3,7]))

                companion(size:74,phase:1.8,tilt:-10).position(x:width*0.23,y:145)
                companion(size:126,phase:0,tilt:0).position(x:width/2,y:112)
                companion(size:80,phase:3.5,tilt:10).position(x:width*0.77,y:152)

                Image(systemName:"sparkle").font(.system(size:15,weight:.light)).foregroundStyle(Color.cyan.opacity(0.65))
                    .position(x:width*0.32,y:61)
                Image(systemName:"sparkle").font(.system(size:10,weight:.light)).foregroundStyle(Color.blue.opacity(0.45))
                    .position(x:width*0.71,y:80)
            }
        }
    }
    private func companion(size:CGFloat,phase:Double,tilt:Double)->some View {
        let bob=time==0 ? 0:sin(time*0.85+phase)
        let blink=time != 0 && (time+phase).truncatingRemainder(dividingBy:7.2)<0.16
        return ZStack {
            Ellipse().fill(Color.blue.opacity(0.10)).frame(width:size*0.75,height:7)
                .offset(y:size*0.67)
            RemarqueCompanion(size:size,blink:blink)
                .rotationEffect(.degrees(tilt+bob*1.5))
                .offset(y:bob*3)
        }.frame(width:size+24,height:size*1.5)
    }
}

private struct RemarqueCompanion:View {
    let size:CGFloat
    let blink:Bool
    private let ink=Color(red:0.13,green:0.30,blue:0.46)
    var body:some View {
        ZStack {
            // Tiny ink arms and feet, drawn behind the original app icon.
            Path { path in
                path.move(to:CGPoint(x:size*0.12,y:size*0.65))
                path.addQuadCurve(to:CGPoint(x:-size*0.08,y:size*0.48),control:CGPoint(x:-size*0.10,y:size*0.78))
                path.move(to:CGPoint(x:size*0.88,y:size*0.65))
                path.addQuadCurve(to:CGPoint(x:size*1.08,y:size*0.44),control:CGPoint(x:size*1.12,y:size*0.68))
                for x in [0.36,0.66] {
                    path.move(to:CGPoint(x:size*x,y:size*0.92))
                    path.addLine(to:CGPoint(x:size*x,y:size*1.12))
                    path.addLine(to:CGPoint(x:size*(x+0.08),y:size*1.12))
                }
            }.stroke(ink.opacity(0.8),style:StrokeStyle(lineWidth:max(2,size*0.022),lineCap:.round,lineJoin:.round))
            Image(nsImage:NSApp.applicationIconImage).resizable().interpolation(.high)
                .frame(width:size,height:size)
                .clipShape(RoundedRectangle(cornerRadius:size*0.21))
                .shadow(color:Color.blue.opacity(0.12),radius:10,x:0,y:5)
            // The face sits on the icon's clear blue bowl, away from its symbols.
            HStack(spacing:size*0.09) {
                ForEach(0..<2) { _ in
                    Capsule().fill(.white).frame(width:size*0.045,height:blink ? size*0.018:size*0.075)
                }
            }.position(x:size*0.69,y:size*0.46)
            Path { path in
                path.move(to:CGPoint(x:size*0.65,y:size*0.55))
                path.addQuadCurve(to:CGPoint(x:size*0.73,y:size*0.55),control:CGPoint(x:size*0.69,y:size*0.60))
            }.stroke(.white.opacity(0.95),style:StrokeStyle(lineWidth:max(1.5,size*0.016),lineCap:.round))
        }.frame(width:size,height:size)
    }
}
