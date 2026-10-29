import Foundation

enum BuildInfo {
    static var version:String{Bundle.main.object(forInfoDictionaryKey:"CFBundleShortVersionString") as? String ?? "0.0.0"}
    static var build:String{Bundle.main.object(forInfoDictionaryKey:"CFBundleVersion") as? String ?? "0"}
    static var label:String{"\(version) (\(build)) · Development"}
}
