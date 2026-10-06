export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          id: number
          name: string
          slug: string
        }
        Insert: {
          id?: number
          name: string
          slug: string
        }
        Update: {
          id?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      channels: {
        Row: {
          avatar_path: string | null
          banner_path: string | null
          created_at: string
          description: string | null
          handle: string
          id: string
          name: string
          owner_id: string
          subscriber_count: number
          verified: boolean
        }
        Insert: {
          avatar_path?: string | null
          banner_path?: string | null
          created_at?: string
          description?: string | null
          handle: string
          id?: string
          name: string
          owner_id: string
          subscriber_count?: number
          verified?: boolean
        }
        Update: {
          avatar_path?: string | null
          banner_path?: string | null
          created_at?: string
          description?: string | null
          handle?: string
          id?: string
          name?: string
          owner_id?: string
          subscriber_count?: number
          verified?: boolean
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          parent_id: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          username: string
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id: string
          username: string
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
      playlists: {
        Row: { id: string; user_id: string; name: string; description: string | null; is_public: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; name: string; description?: string | null; is_public?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; name?: string; description?: string | null; is_public?: boolean; created_at?: string; updated_at?: string }
        Relationships: []
      }
      playlist_items: {
        Row: { playlist_id: string; video_id: string; position: number; added_at: string }
        Insert: { playlist_id: string; video_id: string; position?: number; added_at?: string }
        Update: { playlist_id?: string; video_id?: string; position?: number; added_at?: string }
        Relationships: [
          { foreignKeyName: "playlist_items_playlist_id_fkey"; columns: ["playlist_id"]; isOneToOne: false; referencedRelation: "playlists"; referencedColumns: ["id"] },
          { foreignKeyName: "playlist_items_video_id_fkey"; columns: ["video_id"]; isOneToOne: false; referencedRelation: "videos"; referencedColumns: ["id"] }
        ]
      }
      gems: {
        Row: { user_id: string; video_id: string; created_at: string }
        Insert: { user_id: string; video_id: string; created_at?: string }
        Update: { user_id?: string; video_id?: string; created_at?: string }
        Relationships: [
          { foreignKeyName: "gems_video_id_fkey"; columns: ["video_id"]; isOneToOne: false; referencedRelation: "videos"; referencedColumns: ["id"] }
        ]
      }
      subscriptions: {
        Row: {
          channel_id: string
          created_at: string
          subscriber_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          subscriber_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_reactions: {
        Row: {
          created_at: string
          user_id: string
          value: number
          video_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          value: number
          video_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          value?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_reactions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          category_id: number | null
          channel_id: string
          comment_count: number
          created_at: string
          description: string | null
          dislike_count: number
          duration_seconds: number
          id: string
          is_live: boolean
          like_count: number
          owner_id: string
          tags: string[]
          thumbnail_path: string | null
          title: string
          video_path: string
          view_count: number
          visibility: Database["public"]["Enums"]["video_visibility"]
        }
        Insert: {
          category_id?: number | null
          channel_id: string
          comment_count?: number
          created_at?: string
          description?: string | null
          dislike_count?: number
          duration_seconds?: number
          id?: string
          is_live?: boolean
          like_count?: number
          owner_id: string
          tags?: string[]
          thumbnail_path?: string | null
          title: string
          video_path: string
          view_count?: number
          visibility?: Database["public"]["Enums"]["video_visibility"]
        }
        Update: {
          category_id?: number | null
          channel_id?: string
          comment_count?: number
          created_at?: string
          description?: string | null
          dislike_count?: number
          duration_seconds?: number
          id?: string
          is_live?: boolean
          like_count?: number
          owner_id?: string
          tags?: string[]
          thumbnail_path?: string | null
          title?: string
          video_path?: string
          view_count?: number
          visibility?: Database["public"]["Enums"]["video_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "videos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_history: {
        Row: {
          user_id: string
          video_id: string
          watched_at: string
        }
        Insert: {
          user_id: string
          video_id: string
          watched_at?: string
        }
        Update: {
          user_id?: string
          video_id?: string
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_view: { Args: { _video_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      video_visibility: "public" | "unlisted" | "private"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      video_visibility: ["public", "unlisted", "private"],
    },
  },
} as const
