/** All templates are shipped locally and exercised by the catalogue render test. */
const item=(id,family,title,category,code,experimental=false)=>({id,family,title,category,code,experimental});
export const catalogue=[
item('flowchart','Flowchart','Decision flow','Process',`flowchart TD
  start([Start]) --> review{Approved?}
  review -->|Yes| publish[Publish]
  review -->|No| revise[Revise]
  revise --> review`),
item('swimlane','Swimlane','Team handoff','Process',`swimlane-beta LR
  subgraph Author
    draft[Draft] --> revise[Revise]
  end
  subgraph Reviewer
    check[Review] --> approve[Approve]
  end
  draft --> check
  check --> revise
  revise --> approve`,true),
item('sequence','Sequence','Request and response','Software',`sequenceDiagram
  actor Reader
  participant App
  participant File
  Reader->>App: Open document
  App->>File: Read Markdown
  File-->>App: Text
  App-->>Reader: Editable document`),
item('class','Class','Document model','Software',`classDiagram
  class Document {
    +String title
    +save()
  }
  class Section {
    +String content
  }
  Document "1" *-- "many" Section`),
item('state','State','Document lifecycle','Process',`stateDiagram-v2
  [*] --> Draft
  Draft --> Review: Submit
  Review --> Draft: Revise
  Review --> Published: Approve
  Published --> [*]`),
item('er','Entity relationship','Notes and tags','Software',`erDiagram
  NOTE ||--o{ NOTE_TAG : has
  TAG ||--o{ NOTE_TAG : labels
  NOTE {
    string id PK
    string title
  }
  TAG {
    string id PK
    string name
  }`),
item('journey','User journey','Writing journey','Planning',`journey
  title Create a report
  section Research
    Gather notes: 4: Author
    Check sources: 3: Author, Reviewer
  section Publish
    Edit draft: 5: Author
    Approve: 4: Reviewer`),
item('gantt','Gantt','Project schedule','Planning',`gantt
  title Publication schedule
  dateFormat YYYY-MM-DD
  section Writing
    Research :a, 2026-11-02, 3d
    Draft :b, after a, 5d
  section Review
    Edit :c, after b, 2d
    Publish :milestone, after c, 0d`),
item('pie','Pie','Time allocation','Data',`pie showData
  title Project time
  "Research" : 35
  "Writing" : 45
  "Review" : 20`),
item('quadrant','Quadrant','Prioritization','Planning',`quadrantChart
  title Priorities
  x-axis Low effort --> High effort
  y-axis Low impact --> High impact
  quadrant-1 Plan
  quadrant-2 Do first
  quadrant-3 Defer
  quadrant-4 Reconsider
  Search: [0.3,0.8]
  Collaboration: [0.8,0.9]
  Theme: [0.2,0.3]`),
item('requirement','Requirement','Traceability','Software',`requirementDiagram
  requirement local_editing {
    id: REQ1
    text: Documents remain editable offline.
    risk: low
    verifymethod: test
  }
  element offline_test {
    type: "test"
  }
  offline_test - verifies -> local_editing`),
item('usecase','Use case','Editing roles','Software',`usecase-beta
  direction LR
  actor Writer("Writer")
  systemBoundary "Document editor"
    Write("Edit a document")
    Export("Export a report")
  end
  Writer --> Write
  Writer --> Export`,true),
item('git','Git graph','Review branch','Software',`gitGraph
  commit id: "Start"
  branch feature
  checkout feature
  commit id: "Edit"
  checkout main
  merge feature
  commit id: "Release"`),
item('c4-context','C4','System context','Architecture',`C4Context
  Person(writer, "Writer", "Creates documents")
  System(editor, "Remarque", "Local document editor")
  System_Ext(reader, "Reader", "Reads exported reports")
  Rel(writer, editor, "Writes")
  Rel(editor, reader, "Exports")`,true),
item('c4-container','C4','Containers','Architecture',`C4Container
  Person(writer, "Writer")
  Container(ui, "Desktop app", "Swift", "Document editing")
  ContainerDb(files, "Documents", "Markdown", "User files")
  Rel(writer, ui, "Uses")
  Rel(ui, files, "Reads and writes")`,true),
item('c4-component','C4','Components','Architecture',`C4Component
  Component(source, "Source editor", "AppKit")
  Component(model, "Document engine", "Swift")
  Component(rich, "Rendered editor", "WebKit")
  Rel(source, model, "Edits")
  Rel(rich, model, "Edits")`,true),
item('c4-dynamic','C4','Dynamic interaction','Architecture',`C4Dynamic
  Container(editor, "Editor", "Desktop")
  ContainerDb(file, "File", "Markdown")
  Rel(editor, file, "Read source", "1")
  Rel(file, editor, "Return text", "2")`,true),
item('c4-deployment','C4','Deployment','Architecture',`C4Deployment
  Deployment_Node(mac, "Mac", "macOS") {
    Container(app, "Remarque", "Swift", "Offline editing")
    ContainerDb(docs, "Documents", "Markdown", "Local storage")
  }
  Rel(app, docs, "Reads and writes")`,true),
item('mindmap','Mind map','Report outline','Planning',`mindmap
  root((Report))
    Research
      Interviews
      Evidence
    Findings
      Analysis
      Recommendations
    Appendix`),
item('timeline','Timeline','Milestones','Planning',`timeline
  title Report milestones
  November : Research : Draft
  December : Review
  January : Publication`),
item('zenuml','ZenUML','Editing sequence','Software',`zenuml
  title Save a document
  Writer->Editor.save() {
    File.write()
  }`),
item('sankey','Sankey','Work allocation','Data',`sankey
  Research,Draft,30
  Interviews,Draft,20
  Draft,Review,40
  Draft,Archive,10
  Review,Publish,40`),
item('xy-bar','XY','Bar chart','Data',`xychart-beta
  title "Reports per month"
  x-axis [Jan, Feb, Mar, Apr]
  y-axis "Reports" 0 --> 20
  bar [8, 12, 10, 17]`,true),
item('xy-line','XY','Line chart','Data',`xychart-beta
  title "Review time"
  x-axis [Jan, Feb, Mar, Apr]
  y-axis "Days" 0 --> 10
  line [8, 6, 7, 4]`,true),
item('block','Block','Editor components','Architecture',`block-beta
  columns 3
  Source Engine Preview
  Source --> Engine
  Engine --> Preview`,true),
item('packet','Packet','Message header','Software',`packet-beta
  0-7: "Version"
  8-15: "Flags"
  16-31: "Length"
  32-63: "Message ID"`,true),
item('kanban','Kanban','Writing board','Planning',`kanban
  todo[To do]
    research[Gather sources]
  progress[In progress]
    draft[Write draft]
  done[Done]
    outline[Create outline]`,true),
item('architecture','Architecture','Local app','Architecture',`architecture-beta
  group desktop(cloud)[Desktop]
  service editor(server)[Editor] in desktop
  service storage(disk)[Files] in desktop
  editor:R -- L:storage`,true),
item('radar','Radar','Quality comparison','Data',`radar-beta
  axis clarity["Clarity"], depth["Depth"], accuracy["Accuracy"]
  curve draft["Draft"]{60,80,70}
  curve final["Final"]{90,85,95}
  min 0
  max 100`,true),
item('eventmodeling','Event modeling','Document events','Software',`eventmodeling
  tf 01 ui Editor
  tf 02 cmd SaveDocument
  tf 03 evt DocumentSaved`,true),
item('treemap','Treemap','Report content','Data',`treemap-beta
  "Research"
    "Interviews": 18
    "Sources": 12
  "Report"
    "Findings": 25
    "Appendix": 10`,true),
item('venn','Venn','Evidence overlap','Data',`venn-beta
  title Supporting evidence
  set Documents
  set Interviews
  set Observations
  union Documents,Interviews["Corroboration"]
  union Documents,Interviews,Observations["Strong support"]`,true),
item('ishikawa','Ishikawa','Cause and effect','Planning',`ishikawa-beta
  Delayed publication
  Process
    Too many reviews
    Unclear ownership
  People
    Availability
  Tools
    Manual formatting
  Evidence
    Missing sources`,true),
item('wardley','Wardley','Value chain','Planning',`wardley-beta
  title Document publishing
  anchor Reader [0.95, 0.75]
  component Report [0.75, 0.5]
  component Editor [0.5, 0.6]
  component Storage [0.2, 0.9]
  Reader -> Report
  Report -> Editor
  Editor -> Storage
  evolve Editor 0.8`,true),
item('cynefin','Cynefin','Decision contexts','Planning',`cynefin-beta
  title Report decisions
  clear
    "Apply style guide"
  complicated
    "Review evidence"
  complex
    "Explore new topic"
  chaotic
    "Recover lost work"
  confusion
    "Clarify the question"`,true),
item('tree','TreeView','Project folders','Software',`treeView-beta
├── reports/
│   ├── draft.md
│   └── final.md
├── assets/
│   └── chart.svg
└── README.md`,true),
item('agentflow','Agentflow','Review workflow','Software',`agentflow-beta TB
  flow review["Review workflow"]
    notes["Gather notes"]@{ shape: input }
    check["Check evidence"]@{ shape: task }
    search["Search sources"]@{ shape: tool }
    ready["Ready?"]@{ shape: decision }
    notes --> check --> search --> ready
  end`,true),
item('railroad','Railroad','Native grammar','Grammar',`railroad-beta
  title Note identifier
  identifier = sequence(terminal("note"), terminal(":"), nonterminal("name")) ;`,true),
item('railroad-ebnf','Railroad','EBNF grammar','Grammar',`railroad-ebnf-beta
  title Note identifier
  identifier = "note", ":", name ;
  name = letter, { letter } ;`,true),
item('railroad-abnf','Railroad','ABNF grammar','Grammar',`railroad-abnf-beta
  title Note identifier
  identifier = "note" ":" 1*ALPHA ;`,true),
item('railroad-peg','Railroad','PEG grammar','Grammar',`railroad-peg-beta
  title Note identifier
  Identifier <- "note" ":" Name ;
  Name <- ("a" / "b" / "c")+ ;`,true)
];
export const themes=['default','neutral','dark','forest','base'];
export const looks=['classic','handDrawn','neo'];
export const layouts=['dagre','elk','tidy-tree'];
