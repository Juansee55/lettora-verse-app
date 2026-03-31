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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcement_dismissals: {
        Row: {
          announcement_id: string
          dismissed_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_dismissals_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          title?: string
        }
        Relationships: []
      }
      base_attacks: {
        Row: {
          attacker_gang_id: string
          attacker_id: string
          base_id: string
          created_at: string
          id: string
        }
        Insert: {
          attacker_gang_id: string
          attacker_id: string
          base_id: string
          created_at?: string
          id?: string
        }
        Update: {
          attacker_gang_id?: string
          attacker_id?: string
          base_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "base_attacks_attacker_gang_id_fkey"
            columns: ["attacker_gang_id"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "base_attacks_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "territory_bases"
            referencedColumns: ["id"]
          },
        ]
      }
      base_control_history: {
        Row: {
          base_id: string
          ended_at: string | null
          gang_id: string
          id: string
          started_at: string
        }
        Insert: {
          base_id: string
          ended_at?: string | null
          gang_id: string
          id?: string
          started_at?: string
        }
        Update: {
          base_id?: string
          ended_at?: string | null
          gang_id?: string
          id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "base_control_history_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "territory_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "base_control_history_gang_id_fkey"
            columns: ["gang_id"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
        ]
      }
      book_collaborators: {
        Row: {
          accepted_at: string | null
          book_id: string
          id: string
          invited_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          book_id: string
          id?: string
          invited_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          book_id?: string
          id?: string
          invited_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_collaborators_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      book_promotions: {
        Row: {
          book_id: string
          created_at: string
          description: string | null
          duration_hours: number
          ends_at: string
          id: string
          starts_at: string
          title: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          description?: string | null
          duration_hours?: number
          ends_at: string
          id?: string
          starts_at?: string
          title: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          description?: string | null
          duration_hours?: number
          ends_at?: string
          id?: string
          starts_at?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_promotions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_promotions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      book_reviews: {
        Row: {
          book_id: string
          content: string | null
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          content?: string | null
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          content?: string | null
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          age_rating: string | null
          ai_generated: boolean | null
          author_id: string
          comments_count: number | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          genre: string | null
          id: string
          is_saga: boolean | null
          likes_count: number | null
          parent_saga_id: string | null
          reads_count: number | null
          saga_order: number | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          verification_status: string | null
        }
        Insert: {
          age_rating?: string | null
          ai_generated?: boolean | null
          author_id: string
          comments_count?: number | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          genre?: string | null
          id?: string
          is_saga?: boolean | null
          likes_count?: number | null
          parent_saga_id?: string | null
          reads_count?: number | null
          saga_order?: number | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          verification_status?: string | null
        }
        Update: {
          age_rating?: string | null
          ai_generated?: boolean | null
          author_id?: string
          comments_count?: number | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          genre?: string | null
          id?: string
          is_saga?: boolean | null
          likes_count?: number | null
          parent_saga_id?: string | null
          reads_count?: number | null
          saga_order?: number | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_parent_saga_id_fkey"
            columns: ["parent_saga_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_attack_log: {
        Row: {
          attacked_at: string
          base_id: string
          bot_id: string
          damage_dealt: number
          id: string
        }
        Insert: {
          attacked_at?: string
          base_id: string
          bot_id: string
          damage_dealt?: number
          id?: string
        }
        Update: {
          attacked_at?: string
          base_id?: string
          bot_id?: string
          damage_dealt?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_attack_log_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "territory_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_attack_log_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "user_bots"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_likes: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          book_id: string
          chapter_number: number
          content: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          likes_count: number | null
          title: string
          updated_at: string | null
          word_count: number | null
        }
        Insert: {
          book_id: string
          chapter_number: number
          content?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          likes_count?: number | null
          title: string
          updated_at?: string | null
          word_count?: number | null
        }
        Update: {
          book_id?: string
          chapter_number?: number
          content?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          likes_count?: number | null
          title?: string
          updated_at?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          commentable_id: string
          commentable_type: string
          content: string
          created_at: string | null
          id: string
          likes_count: number | null
          parent_id: string | null
          user_id: string
        }
        Insert: {
          commentable_id: string
          commentable_type: string
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          user_id: string
        }
        Update: {
          commentable_id?: string
          commentable_type?: string
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          user_id?: string
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
        ]
      }
      content_hashtags: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          hashtag_id: string
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          hashtag_id: string
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          hashtag_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_hashtags_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "hashtags"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          admin_notes: string | null
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          muted_until: string | null
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted_until?: string | null
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted_until?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          admin_only_messages: boolean
          avatar: string | null
          created_at: string
          description: string | null
          id: string
          is_group: boolean | null
          is_public: boolean
          name: string | null
          pinned_message_id: string | null
          slow_mode_seconds: number
          updated_at: string
        }
        Insert: {
          admin_only_messages?: boolean
          avatar?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_group?: boolean | null
          is_public?: boolean
          name?: string | null
          pinned_message_id?: string | null
          slow_mode_seconds?: number
          updated_at?: string
        }
        Update: {
          admin_only_messages?: boolean
          avatar?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_group?: boolean | null
          is_public?: boolean
          name?: string | null
          pinned_message_id?: string | null
          slow_mode_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_pinned_message_id_fkey"
            columns: ["pinned_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      event_messages: {
        Row: {
          content: string
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          event_id: string
          id: string
          joined_at: string
          points: number
          status: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          joined_at?: string
          points?: number
          status?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          joined_at?: string
          points?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_round_participants: {
        Row: {
          eliminated_at: string | null
          id: string
          round_id: string
          status: string
          user_id: string
        }
        Insert: {
          eliminated_at?: string | null
          id?: string
          round_id: string
          status?: string
          user_id: string
        }
        Update: {
          eliminated_at?: string | null
          id?: string
          round_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_round_participants_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "event_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rounds: {
        Row: {
          created_at: string
          event_id: string
          id: string
          round_number: number
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          round_number?: number
          status?: string
          title?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          round_number?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rounds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          rules: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          rules?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          rules?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      followers: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followers_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followers_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fort_events: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          started_at: string
          status: string
          top_gangs: Json | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          top_gangs?: Json | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          top_gangs?: Json | null
        }
        Relationships: []
      }
      gang_allies: {
        Row: {
          allied_gang_id: string
          created_at: string
          gang_id: string
          id: string
        }
        Insert: {
          allied_gang_id: string
          created_at?: string
          gang_id: string
          id?: string
        }
        Update: {
          allied_gang_id?: string
          created_at?: string
          gang_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gang_allies_allied_gang_id_fkey"
            columns: ["allied_gang_id"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gang_allies_gang_id_fkey"
            columns: ["gang_id"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
        ]
      }
      gang_members: {
        Row: {
          gang_id: string
          id: string
          is_bot: boolean
          is_leader: boolean
          joined_at: string
          rank: string
          user_id: string
        }
        Insert: {
          gang_id: string
          id?: string
          is_bot?: boolean
          is_leader?: boolean
          joined_at?: string
          rank?: string
          user_id: string
        }
        Update: {
          gang_id?: string
          id?: string
          is_bot?: boolean
          is_leader?: boolean
          joined_at?: string
          rank?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gang_members_gang_id_fkey"
            columns: ["gang_id"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
        ]
      }
      gang_milestones: {
        Row: {
          gang_id: string
          id: string
          milestone_hours: number
          unlocked_at: string
        }
        Insert: {
          gang_id: string
          id?: string
          milestone_hours: number
          unlocked_at?: string
        }
        Update: {
          gang_id?: string
          id?: string
          milestone_hours?: number
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gang_milestones_gang_id_fkey"
            columns: ["gang_id"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
        ]
      }
      gang_reward_claims: {
        Row: {
          badge_id: string | null
          claimed_at: string
          gang_id: string
          granted_by: string | null
          id: string
          milestone_hours: number
          status: string
          user_id: string
        }
        Insert: {
          badge_id?: string | null
          claimed_at?: string
          gang_id: string
          granted_by?: string | null
          id?: string
          milestone_hours?: number
          status?: string
          user_id: string
        }
        Update: {
          badge_id?: string | null
          claimed_at?: string
          gang_id?: string
          granted_by?: string | null
          id?: string
          milestone_hours?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gang_reward_claims_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "user_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gang_reward_claims_gang_id_fkey"
            columns: ["gang_id"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
        ]
      }
      gang_rooms: {
        Row: {
          created_at: string
          description: string | null
          gang_id: string
          id: string
          milestone_hours: number
          name: string
          room_number: number
          theme_css: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          gang_id: string
          id?: string
          milestone_hours: number
          name?: string
          room_number?: number
          theme_css?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          gang_id?: string
          id?: string
          milestone_hours?: number
          name?: string
          room_number?: number
          theme_css?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gang_rooms_gang_id_fkey"
            columns: ["gang_id"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
        ]
      }
      gangs: {
        Row: {
          bonus_hours: number
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_npc: boolean
          name: string
          photo_url: string | null
        }
        Insert: {
          bonus_hours?: number
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_npc?: boolean
          name: string
          photo_url?: string | null
        }
        Update: {
          bonus_hours?: number
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_npc?: boolean
          name?: string
          photo_url?: string | null
        }
        Relationships: []
      }
      group_invitations: {
        Row: {
          conversation_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          invite_code: string
          invited_by: string
          max_uses: number | null
          uses_count: number | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          invited_by: string
          max_uses?: number | null
          uses_count?: number | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          invited_by?: string
          max_uses?: number | null
          uses_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "group_invitations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      hashtags: {
        Row: {
          created_at: string
          id: string
          name: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          usage_count?: number
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          likeable_id: string
          likeable_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          likeable_id: string
          likeable_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          likeable_id?: string
          likeable_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      literary_posts: {
        Row: {
          comments_count: number
          content: string
          created_at: string
          id: string
          likes_count: number
          linked_book_id: string | null
          post_type: string
          quote_text: string | null
          think_count: number
          touched_count: number
          updated_at: string
          user_id: string
          want_read_count: number
        }
        Insert: {
          comments_count?: number
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          linked_book_id?: string | null
          post_type?: string
          quote_text?: string | null
          think_count?: number
          touched_count?: number
          updated_at?: string
          user_id: string
          want_read_count?: number
        }
        Update: {
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          linked_book_id?: string | null
          post_type?: string
          quote_text?: string | null
          think_count?: number
          touched_count?: number
          updated_at?: string
          user_id?: string
          want_read_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "literary_posts_linked_book_id_fkey"
            columns: ["linked_book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      mentions: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          mentioned_user_id: string
          mentioner_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          mentioned_user_id: string
          mentioner_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          mentioned_user_id?: string
          mentioner_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      microstories: {
        Row: {
          author_id: string
          comments_count: number | null
          content: string
          created_at: string | null
          id: string
          likes_count: number | null
          max_length: number | null
          reposts_count: number | null
          title: string | null
        }
        Insert: {
          author_id: string
          comments_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          max_length?: number | null
          reposts_count?: number | null
          title?: string | null
        }
        Update: {
          author_id?: string
          comments_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          max_length?: number | null
          reposts_count?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "microstories_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      microstory_collaborators: {
        Row: {
          accepted_at: string | null
          id: string
          invited_at: string | null
          microstory_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          invited_at?: string | null
          microstory_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          invited_at?: string | null
          microstory_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "microstory_collaborators_microstory_id_fkey"
            columns: ["microstory_id"]
            isOneToOne: false
            referencedRelation: "microstories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "microstory_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      microstory_reposts: {
        Row: {
          created_at: string
          id: string
          microstory_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          microstory_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          microstory_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "microstory_reposts_microstory_id_fkey"
            columns: ["microstory_id"]
            isOneToOne: false
            referencedRelation: "microstories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "microstory_reposts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          news_type: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          news_type?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          news_type?: string
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "literary_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number | null
          content: string | null
          created_at: string
          id: string
          likes_count: number | null
          media_type: string
          media_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          content?: string | null
          created_at?: string
          id?: string
          likes_count?: number | null
          media_type?: string
          media_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number | null
          content?: string | null
          created_at?: string
          id?: string
          likes_count?: number | null
          media_type?: string
          media_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_items: {
        Row: {
          created_at: string
          css_value: string | null
          description: string | null
          id: string
          image_url: string
          item_type: string
          level_required: number | null
          name: string
          price: number
          rarity: string
        }
        Insert: {
          created_at?: string
          css_value?: string | null
          description?: string | null
          id?: string
          image_url: string
          item_type: string
          level_required?: number | null
          name: string
          price?: number
          rarity?: string
        }
        Update: {
          created_at?: string
          css_value?: string | null
          description?: string | null
          id?: string
          image_url?: string
          item_type?: string
          level_required?: number | null
          name?: string
          price?: number
          rarity?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          cover_url: string | null
          created_at: string | null
          display_name: string | null
          favorite_genres: string[] | null
          followers_visibility: string
          id: string
          is_banned: boolean | null
          is_private: boolean | null
          is_verified: boolean | null
          location: string | null
          premium_theme: string | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          favorite_genres?: string[] | null
          followers_visibility?: string
          id: string
          is_banned?: boolean | null
          is_private?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          premium_theme?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          favorite_genres?: string[] | null
          followers_visibility?: string
          id?: string
          is_banned?: boolean | null
          is_private?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          premium_theme?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      promotion_views: {
        Row: {
          id: string
          promotion_id: string
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          promotion_id: string
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          promotion_id?: string
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          book_id: string
          completed_at: string | null
          current_chapter: number | null
          id: string
          progress_percent: number | null
          started_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          book_id: string
          completed_at?: string | null
          current_chapter?: number | null
          id?: string
          progress_percent?: number | null
          started_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          book_id?: string
          completed_at?: string | null
          current_chapter?: number | null
          id?: string
          progress_percent?: number | null
          started_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_books: {
        Row: {
          book_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_chapters: {
        Row: {
          book_id: string
          chapter_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          chapter_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          chapter_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_chapters_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      social_links: {
        Row: {
          created_at: string
          created_by: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          platform: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          platform: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          platform?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      staff_bday_messages: {
        Row: {
          bday_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          bday_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          bday_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_bday_messages_bday_id_fkey"
            columns: ["bday_id"]
            isOneToOne: false
            referencedRelation: "staff_birthdays"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_birthdays: {
        Row: {
          created_at: string
          created_by: string
          gift_item_id: string | null
          id: string
          is_active: boolean
          message: string | null
          staff_user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          gift_item_id?: string | null
          id?: string
          is_active?: boolean
          message?: string | null
          staff_user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          gift_item_id?: string | null
          id?: string
          is_active?: boolean
          message?: string | null
          staff_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_birthdays_gift_item_id_fkey"
            columns: ["gift_item_id"]
            isOneToOne: false
            referencedRelation: "profile_items"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_contracts: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          form_link: string | null
          id: string
          is_active: boolean
          title: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          form_link?: string | null
          id?: string
          is_active?: boolean
          title: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          form_link?: string | null
          id?: string
          is_active?: boolean
          title?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          background_color: string | null
          created_at: string
          expires_at: string
          font_style: string | null
          id: string
          media_type: string
          media_url: string | null
          text_content: string | null
          user_id: string
          views_count: number | null
        }
        Insert: {
          background_color?: string | null
          created_at?: string
          expires_at: string
          font_style?: string | null
          id?: string
          media_type?: string
          media_url?: string | null
          text_content?: string | null
          user_id: string
          views_count?: number | null
        }
        Update: {
          background_color?: string | null
          created_at?: string
          expires_at?: string
          font_style?: string | null
          id?: string
          media_type?: string
          media_url?: string | null
          text_content?: string | null
          user_id?: string
          views_count?: number | null
        }
        Relationships: []
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          id?: string
          story_id: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          id?: string
          story_id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_bases: {
        Row: {
          base_number: number
          controlled_since: string | null
          controlling_gang_id: string | null
          defender_hp: number
          defender_id: string | null
          defender_max_hp: number
          defender_respawn_at: string | null
          hp: number
          id: string
          max_hp: number
          name: string
        }
        Insert: {
          base_number: number
          controlled_since?: string | null
          controlling_gang_id?: string | null
          defender_hp?: number
          defender_id?: string | null
          defender_max_hp?: number
          defender_respawn_at?: string | null
          hp?: number
          id?: string
          max_hp?: number
          name: string
        }
        Update: {
          base_number?: number
          controlled_since?: string | null
          controlling_gang_id?: string | null
          defender_hp?: number
          defender_id?: string | null
          defender_max_hp?: number
          defender_respawn_at?: string | null
          hp?: number
          id?: string
          max_hp?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_bases_controlling_gang_id_fkey"
            columns: ["controlling_gang_id"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_type: string
          created_at: string
          created_by: string
          description: string | null
          emoji: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          badge_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          emoji?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          badge_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          emoji?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_bots: {
        Row: {
          bot_name: string
          gang_id: string
          id: string
          is_active: boolean
          purchased_at: string
          user_id: string
        }
        Insert: {
          bot_name?: string
          gang_id: string
          id?: string
          is_active?: boolean
          purchased_at?: string
          user_id: string
        }
        Update: {
          bot_name?: string
          gang_id?: string
          id?: string
          is_active?: boolean
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bots_gang_id_fkey"
            columns: ["gang_id"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_coins: {
        Row: {
          balance: number
          id: string
          total_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          total_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          total_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_equipped_badges: {
        Row: {
          badge_id: string
          equipped_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          equipped_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          equipped_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_equipped_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "user_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_items: {
        Row: {
          id: string
          is_equipped: boolean
          item_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_equipped?: boolean
          item_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_equipped?: boolean
          item_id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "profile_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_levels: {
        Row: {
          id: string
          level: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          id?: string
          level?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          id?: string
          level?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          admin_title: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          admin_title?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          admin_title?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_weapons: {
        Row: {
          id: string
          purchased_at: string
          upgrade_level: number
          user_id: string
          weapon_id: string
        }
        Insert: {
          id?: string
          purchased_at?: string
          upgrade_level?: number
          user_id: string
          weapon_id: string
        }
        Update: {
          id?: string
          purchased_at?: string
          upgrade_level?: number
          user_id?: string
          weapon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_weapons_weapon_id_fkey"
            columns: ["weapon_id"]
            isOneToOne: false
            referencedRelation: "weapons"
            referencedColumns: ["id"]
          },
        ]
      }
      valentine_quest_completions: {
        Row: {
          completed_at: string
          id: string
          microstory_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          microstory_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          microstory_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "valentine_quest_completions_microstory_id_fkey"
            columns: ["microstory_id"]
            isOneToOne: false
            referencedRelation: "microstories"
            referencedColumns: ["id"]
          },
        ]
      }
      weapon_loadout: {
        Row: {
          equipped_at: string
          id: string
          slot_number: number
          user_id: string
          user_weapon_id: string
        }
        Insert: {
          equipped_at?: string
          id?: string
          slot_number: number
          user_id: string
          user_weapon_id: string
        }
        Update: {
          equipped_at?: string
          id?: string
          slot_number?: number
          user_id?: string
          user_weapon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weapon_loadout_user_weapon_id_fkey"
            columns: ["user_weapon_id"]
            isOneToOne: false
            referencedRelation: "user_weapons"
            referencedColumns: ["id"]
          },
        ]
      }
      weapons: {
        Row: {
          base_damage: number
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          rarity: string
        }
        Insert: {
          base_damage?: number
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          rarity?: string
        }
        Update: {
          base_damage?: number
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          rarity?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_helper_bot: {
        Args: { p_bot_name?: string; p_gang_id: string }
        Returns: Json
      }
      admin_adjust_gang_hours: {
        Args: { p_gang_id: string; p_hours: number }
        Returns: undefined
      }
      admin_capture_base: {
        Args: { p_base_id: string; p_gang_id: string }
        Returns: Json
      }
      admin_update_book_stats: {
        Args: {
          p_book_id: string
          p_likes_delta?: number
          p_reads_delta?: number
        }
        Returns: undefined
      }
      attack_base: {
        Args: { p_attacker_gang_id: string; p_base_id: string }
        Returns: Json
      }
      award_xp: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      bot_auto_attack: {
        Args: { p_base_id: string; p_bot_id: string; p_gang_id: string }
        Returns: Json
      }
      buy_bot: {
        Args: { p_bot_name?: string; p_gang_id: string }
        Returns: Json
      }
      buy_weapon: { Args: { p_weapon_id: string }; Returns: Json }
      calculate_level: { Args: { p_xp: number }; Returns: number }
      enter_base: { Args: { p_base_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      heal_base: { Args: { p_base_id: string }; Returns: Json }
      is_conversation_participant: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: boolean
      }
      leave_base: { Args: { p_base_id: string }; Returns: Json }
      purchase_item: {
        Args: { p_item_id: string; p_user_id: string }
        Returns: boolean
      }
      upgrade_weapon: { Args: { p_user_weapon_id: string }; Returns: Json }
      upsert_hashtags: {
        Args: {
          p_content_id: string
          p_content_type: string
          p_tags: string[]
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
    },
  },
} as const
