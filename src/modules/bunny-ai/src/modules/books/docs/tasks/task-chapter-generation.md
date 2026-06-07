# Feature Request
## Feature: Update chapter component generation
### Component
- BUIBookChapterComponentGenerate
### Request
- Add props that accepts book id
- Get Book and Author from that book base on id
- call buiChapterServerGenerate passing the book and author
- remove asking fill chapters base on book meta data.
- keep aligh logic structure base on author profile
- Update the template type option it should be base on BUIChapterPromptType.generateChapters
- it has way that selecting prompt could also display systemPrompt details

## Feature: Update chapter prompt
- BUIChapterPromptType. add atleast 5 variant
- add another configuration on generateChapterExtraPrompt:
  - `
    Return ONLY a valid JSON array (no extra text) with this structure:
  `
- Add ANothr Property that it only receive title and description without author
- Prompt can write with relatively base author or without author

## FeatureL Update buiBookChapterModule
- The module is ts file not tsx so tsx element not compatible inside. use React.CreateEleemnt for status or generate seperate component passing the row.


## Feature: Add Author description on BUIBookComponentCard
- Inside accordion should add Author name and description on it base on book. Support Author State
