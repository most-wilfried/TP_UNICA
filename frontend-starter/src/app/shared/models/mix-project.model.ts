export interface MixProject {
  id: string;
  ownerId?:string;sharedWith?:string[];visibility?:string;
  name: string;
  artist: string;
  genre: string;
  tags: string[];
  coverImageUrl: string;
  updatedAt: string;
  settings?: { effects?: unknown };
}
