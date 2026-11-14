/** Public user data returned by the API. */
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  bio?:string;avatarUrl?:string;discoverable?:boolean;notificationsEnabled?:boolean;role?:string;
}
