// Database-specific types
// Run `npm run db:generate-types` to regenerate from Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// This file will be replaced by database.types.ts after running generate-types
// For now, we export a minimal structure
export interface Database {
  public: {
    Tables: {
      users: any;
      user_settings: any;
      channels: any;
      user_channels: any;
      videos: any;
      transcripts: any;
      summaries: any;
      bookmarks: any;
      watch_history: any;
    }
  }
}
