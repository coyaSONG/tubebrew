// Database-specific types (will be generated from Supabase schema)
// TODO: Generate types from Supabase schema after database setup

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // Will be populated after schema migration
    }
  }
}
