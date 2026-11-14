/** Audio track metadata returned by the API. */
export interface Track {
  id: string;
  title: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  ownerId?:string;style?:string;author?:string;visibility?:'private'|'friends'|'public';tags?:string[];sharedWith?:string[];coverImageUrl?:string;duration?:number;remixAllowed?:boolean;credits?:Array<{userId:string;name:string}>;parentId?:string|null;kind?:'track'|'mix'|'remix';
}
