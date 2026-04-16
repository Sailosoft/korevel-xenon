export interface IBookBuilderGeneration {
  title: string;
  chapters: IBookBuilderChapter[];
}
export interface IBookBuilderChapter {
  number: number;
  title: string;
  description: string;
}
