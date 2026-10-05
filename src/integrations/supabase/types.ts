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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_reward_grants: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          nonce: string
          placement: string
          reward_amount: number
          reward_type: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          nonce: string
          placement: string
          reward_amount?: number
          reward_type: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          nonce?: string
          placement?: string
          reward_amount?: number
          reward_type?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_agent_reports: {
        Row: {
          answer: string
          created_at: string
          id: string
          question: string
          reason: string | null
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question: string
          reason?: string | null
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_agent_usage: {
        Row: {
          created_at: string
          first_unlock_at: string | null
          free_used: boolean
          questions_asked: number
          unlock_ads: number
          unlocked_until: string | null
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_unlock_at?: string | null
          free_used?: boolean
          questions_asked?: number
          unlock_ads?: number
          unlocked_until?: string | null
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_unlock_at?: string | null
          free_used?: boolean
          questions_asked?: number
          unlock_ads?: number
          unlocked_until?: string | null
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_arena_sessions: {
        Row: {
          ai_cash: number
          ai_return: number | null
          ai_score: number | null
          bot_id: string
          created_at: string
          end_time: string
          id: string
          last_bot_tick_at: string
          result_summary: string | null
          start_time: string
          starting_balance: number
          status: string
          updated_at: string
          user_cash: number
          user_id: string
          user_return: number | null
          user_score: number | null
          winner: string | null
        }
        Insert: {
          ai_cash?: number
          ai_return?: number | null
          ai_score?: number | null
          bot_id: string
          created_at?: string
          end_time: string
          id?: string
          last_bot_tick_at?: string
          result_summary?: string | null
          start_time?: string
          starting_balance?: number
          status?: string
          updated_at?: string
          user_cash?: number
          user_id: string
          user_return?: number | null
          user_score?: number | null
          winner?: string | null
        }
        Update: {
          ai_cash?: number
          ai_return?: number | null
          ai_score?: number | null
          bot_id?: string
          created_at?: string
          end_time?: string
          id?: string
          last_bot_tick_at?: string
          result_summary?: string | null
          start_time?: string
          starting_balance?: number
          status?: string
          updated_at?: string
          user_cash?: number
          user_id?: string
          user_return?: number | null
          user_score?: number | null
          winner?: string | null
        }
        Relationships: []
      }
      ai_trade_reviews: {
        Row: {
          areas_to_review: string[]
          consistency_score: number
          created_at: string
          detected_patterns: string[]
          discipline_score: number
          educational_note: string
          id: string
          provider: string
          risk_management_score: number
          strengths: string[]
          summary: string
          timing_score: number
          trade_id: string
          user_id: string
        }
        Insert: {
          areas_to_review?: string[]
          consistency_score?: number
          created_at?: string
          detected_patterns?: string[]
          discipline_score?: number
          educational_note?: string
          id?: string
          provider?: string
          risk_management_score?: number
          strengths?: string[]
          summary: string
          timing_score?: number
          trade_id: string
          user_id: string
        }
        Update: {
          areas_to_review?: string[]
          consistency_score?: number
          created_at?: string
          detected_patterns?: string[]
          discipline_score?: number
          educational_note?: string
          id?: string
          provider?: string
          risk_management_score?: number
          strengths?: string[]
          summary?: string
          timing_score?: number
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_trade_reviews_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: true
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_trades: {
        Row: {
          arena_session_id: string
          asset_type: string
          closed_at: string | null
          created_at: string
          current_price: number | null
          direction: string
          entry_price: number
          exit_price: number | null
          id: string
          opened_at: string
          owner_type: string
          pnl: number | null
          position_size: number
          quantity: number
          status: string
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          unrealized_pnl: number | null
        }
        Insert: {
          arena_session_id: string
          asset_type: string
          closed_at?: string | null
          created_at?: string
          current_price?: number | null
          direction: string
          entry_price: number
          exit_price?: number | null
          id?: string
          opened_at?: string
          owner_type: string
          pnl?: number | null
          position_size: number
          quantity: number
          status?: string
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          unrealized_pnl?: number | null
        }
        Update: {
          arena_session_id?: string
          asset_type?: string
          closed_at?: string | null
          created_at?: string
          current_price?: number | null
          direction?: string
          entry_price?: number
          exit_price?: number | null
          id?: string
          opened_at?: string
          owner_type?: string
          pnl?: number | null
          position_size?: number
          quantity?: number
          status?: string
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          unrealized_pnl?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_trades_arena_session_id_fkey"
            columns: ["arena_session_id"]
            isOneToOne: false
            referencedRelation: "ai_arena_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_type: string
          created_at: string
          display_symbol: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          symbol: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          display_symbol: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          symbol: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          display_symbol?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          code: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      career_mission_completions: {
        Row: {
          completed_at: string
          id: string
          mission_key: string
          reward_xp: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          mission_key: string
          reward_xp?: number
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          mission_key?: string
          reward_xp?: number
          user_id?: string
        }
        Relationships: []
      }
      career_progress: {
        Row: {
          career_title: string
          career_xp: number
          created_at: string
          current_stage: string
          specialization: string | null
          unlocked_specializations: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          career_title?: string
          career_xp?: number
          created_at?: string
          current_stage?: string
          specialization?: string | null
          unlocked_specializations?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          career_title?: string
          career_xp?: number
          created_at?: string
          current_stage?: string
          specialization?: string | null
          unlocked_specializations?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      career_stage_unlocks: {
        Row: {
          id: string
          stage_key: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          stage_key: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          stage_key?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          challenge_type: string
          code: string
          created_at: string
          description: string
          end_date: string | null
          id: string
          is_active: boolean
          metric: string
          reward_credits: number
          reward_xp: number
          start_date: string | null
          target: number
          title: string
        }
        Insert: {
          challenge_type: string
          code: string
          created_at?: string
          description: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          metric: string
          reward_credits?: number
          reward_xp?: number
          start_date?: string | null
          target?: number
          title: string
        }
        Update: {
          challenge_type?: string
          code?: string
          created_at?: string
          description?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          metric?: string
          reward_credits?: number
          reward_xp?: number
          start_date?: string | null
          target?: number
          title?: string
        }
        Relationships: []
      }
      competition_participants: {
        Row: {
          cash: number
          competition_id: string
          created_at: string
          drawdown: number | null
          equity: number | null
          id: string
          joined_at: string
          rank: number | null
          return_pct: number | null
          rewarded: boolean
          score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cash?: number
          competition_id: string
          created_at?: string
          drawdown?: number | null
          equity?: number | null
          id?: string
          joined_at?: string
          rank?: number | null
          return_pct?: number | null
          rewarded?: boolean
          score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cash?: number
          competition_id?: string
          created_at?: string
          drawdown?: number | null
          equity?: number | null
          id?: string
          joined_at?: string
          rank?: number | null
          return_pct?: number | null
          rewarded?: boolean
          score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_participants_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_trades: {
        Row: {
          asset_type: string
          closed_at: string | null
          competition_id: string
          created_at: string
          current_price: number | null
          direction: string
          entry_price: number
          exit_price: number | null
          id: string
          opened_at: string
          participant_id: string
          pnl: number | null
          position_size: number
          quantity: number
          status: string
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          unrealized_pnl: number | null
        }
        Insert: {
          asset_type: string
          closed_at?: string | null
          competition_id: string
          created_at?: string
          current_price?: number | null
          direction: string
          entry_price: number
          exit_price?: number | null
          id?: string
          opened_at?: string
          participant_id: string
          pnl?: number | null
          position_size: number
          quantity: number
          status?: string
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          unrealized_pnl?: number | null
        }
        Update: {
          asset_type?: string
          closed_at?: string | null
          competition_id?: string
          created_at?: string
          current_price?: number | null
          direction?: string
          entry_price?: number
          exit_price?: number | null
          id?: string
          opened_at?: string
          participant_id?: string
          pnl?: number | null
          position_size?: number
          quantity?: number
          status?: string
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          unrealized_pnl?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_trades_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_trades_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "competition_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          created_at: string
          created_by: string | null
          duration_days: number
          end_time: string | null
          id: string
          invite_code: string | null
          is_public: boolean
          kind: string
          market_category: string
          max_participants: number
          period_key: string | null
          result_summary: string | null
          start_time: string | null
          starting_balance: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_days?: number
          end_time?: string | null
          id?: string
          invite_code?: string | null
          is_public?: boolean
          kind: string
          market_category?: string
          max_participants?: number
          period_key?: string | null
          result_summary?: string | null
          start_time?: string | null
          starting_balance?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_days?: number
          end_time?: string | null
          id?: string
          invite_code?: string | null
          is_public?: boolean
          kind?: string
          market_category?: string
          max_participants?: number
          period_key?: string | null
          result_summary?: string | null
          start_time?: string | null
          starting_balance?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          source: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          source: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          source?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_rewards: {
        Row: {
          claimed_at: string
          id: string
          next_claim_at: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          next_claim_at?: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          next_claim_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leaderboard_snapshots: {
        Row: {
          consistency_score: number
          created_at: string
          id: string
          period: string
          rank: number
          trading_skill_score: number
          user_id: string
        }
        Insert: {
          consistency_score?: number
          created_at?: string
          id?: string
          period: string
          rank: number
          trading_skill_score: number
          user_id: string
        }
        Update: {
          consistency_score?: number
          created_at?: string
          id?: string
          period?: string
          rank?: number
          trading_skill_score?: number
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          kind: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          id: string
          is_leaderboard_visible: boolean
          is_public_profile: boolean
          level: number
          onboarding_completed: boolean
          show_country: boolean
          trading_skill_score: number
          updated_at: string
          username: string
          virtual_balance: number
          virtual_credits: number
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          id: string
          is_leaderboard_visible?: boolean
          is_public_profile?: boolean
          level?: number
          onboarding_completed?: boolean
          show_country?: boolean
          trading_skill_score?: number
          updated_at?: string
          username: string
          virtual_balance?: number
          virtual_credits?: number
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_leaderboard_visible?: boolean
          is_public_profile?: boolean
          level?: number
          onboarding_completed?: boolean
          show_country?: boolean
          trading_skill_score?: number
          updated_at?: string
          username?: string
          virtual_balance?: number
          virtual_credits?: number
          xp?: number
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      strategies: {
        Row: {
          created_at: string
          entry_conditions: string | null
          exit_conditions: string | null
          id: string
          market: string
          max_position_pct: number | null
          name: string
          notes: string | null
          position_sizing_rule: string | null
          requires_stop_loss: boolean
          requires_take_profit: boolean
          risk_rule: string | null
          stop_loss_rule: string | null
          take_profit_rule: string | null
          timeframe: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_conditions?: string | null
          exit_conditions?: string | null
          id?: string
          market?: string
          max_position_pct?: number | null
          name: string
          notes?: string | null
          position_sizing_rule?: string | null
          requires_stop_loss?: boolean
          requires_take_profit?: boolean
          risk_rule?: string | null
          stop_loss_rule?: string | null
          take_profit_rule?: string | null
          timeframe?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_conditions?: string | null
          exit_conditions?: string | null
          id?: string
          market?: string
          max_position_pct?: number | null
          name?: string
          notes?: string | null
          position_sizing_rule?: string | null
          requires_stop_loss?: boolean
          requires_take_profit?: boolean
          risk_rule?: string | null
          stop_loss_rule?: string | null
          take_profit_rule?: string | null
          timeframe?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_journals: {
        Row: {
          confidence: number | null
          created_at: string
          emotion: string | null
          entry_reason: string | null
          exit_reason: string | null
          id: string
          improve: string | null
          notes: string | null
          strategy: string | null
          thesis: string | null
          trade_id: string
          updated_at: string
          user_id: string
          went_well: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          emotion?: string | null
          entry_reason?: string | null
          exit_reason?: string | null
          id?: string
          improve?: string | null
          notes?: string | null
          strategy?: string | null
          thesis?: string | null
          trade_id: string
          updated_at?: string
          user_id: string
          went_well?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          emotion?: string | null
          entry_reason?: string | null
          exit_reason?: string | null
          id?: string
          improve?: string | null
          notes?: string | null
          strategy?: string | null
          thesis?: string | null
          trade_id?: string
          updated_at?: string
          user_id?: string
          went_well?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_journals_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trader_dna_profiles: {
        Row: {
          activity_level: string
          calculated_at: string
          consistency_score: number
          discipline_score: number
          patience_score: number
          personality: string
          position_size_management_score: number
          risk_control_score: number
          user_id: string
        }
        Insert: {
          activity_level?: string
          calculated_at?: string
          consistency_score?: number
          discipline_score?: number
          patience_score?: number
          personality?: string
          position_size_management_score?: number
          risk_control_score?: number
          user_id: string
        }
        Update: {
          activity_level?: string
          calculated_at?: string
          consistency_score?: number
          discipline_score?: number
          patience_score?: number
          personality?: string
          position_size_management_score?: number
          risk_control_score?: number
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          asset_id: string | null
          asset_type: string
          closed_at: string | null
          created_at: string
          current_price: number | null
          direction: string
          entry_price: number
          exit_price: number | null
          id: string
          notes: string | null
          opened_at: string
          position_size: number
          realized_pnl: number | null
          review: string | null
          status: string
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          unrealized_pnl: number | null
          user_id: string
        }
        Insert: {
          asset_id?: string | null
          asset_type: string
          closed_at?: string | null
          created_at?: string
          current_price?: number | null
          direction: string
          entry_price: number
          exit_price?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          position_size: number
          realized_pnl?: number | null
          review?: string | null
          status?: string
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          unrealized_pnl?: number | null
          user_id: string
        }
        Update: {
          asset_id?: string | null
          asset_type?: string
          closed_at?: string | null
          created_at?: string
          current_price?: number | null
          direction?: string
          entry_price?: number
          exit_price?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          position_size?: number
          realized_pnl?: number | null
          review?: string | null
          status?: string
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          unrealized_pnl?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ad_activity: {
        Row: {
          activity_date: string
          ai_coach_rewards: number
          arena_rewards: number
          bonus_ai_analyses: number
          career_rewards: number
          created_at: string
          interstitial_ads_shown: number
          last_interstitial_at: string | null
          rewarded_ads_completed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_date?: string
          ai_coach_rewards?: number
          arena_rewards?: number
          bonus_ai_analyses?: number
          career_rewards?: number
          created_at?: string
          interstitial_ads_shown?: number
          last_interstitial_at?: string | null
          rewarded_ads_completed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          ai_coach_rewards?: number
          arena_rewards?: number
          bonus_ai_analyses?: number
          career_rewards?: number
          created_at?: string
          interstitial_ads_shown?: number
          last_interstitial_at?: string | null
          rewarded_ads_completed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenges: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string
          id: string
          period_key: string
          progress: number
          status: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          period_key: string
          progress?: number
          status?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          period_key?: string
          progress?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_personalization: {
        Row: {
          active_learning_mode: string
          created_at: string
          experience_level: string
          full_name: string | null
          hypothetical_starting_capital_range: string | null
          learning_goal: string | null
          mobile: string | null
          personalization_completed: boolean
          preferred_markets: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          active_learning_mode?: string
          created_at?: string
          experience_level?: string
          full_name?: string | null
          hypothetical_starting_capital_range?: string | null
          learning_goal?: string | null
          mobile?: string | null
          personalization_completed?: boolean
          preferred_markets?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          active_learning_mode?: string
          created_at?: string
          experience_level?: string
          full_name?: string | null
          hypothetical_starting_capital_range?: string | null
          learning_goal?: string | null
          mobile?: string | null
          personalization_completed?: boolean
          preferred_markets?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      xp_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_leaderboard: {
        Args: { _limit?: number; _period?: string }
        Returns: {
          avatar_url: string
          level: number
          rank: number
          trading_skill_score: number
          user_id: string
          username: string
        }[]
      }
      get_season_leaderboard: {
        Args: { _limit?: number; _season_end: string; _season_start: string }
        Returns: {
          avatar_url: string
          challenges_completed: number
          level: number
          rank: number
          season_points: number
          user_id: string
          username: string
          xp_in_season: number
        }[]
      }
      get_social_leaderboard: {
        Args: { _country?: string; _limit?: number; _offset?: number }
        Returns: {
          avatar_url: string
          country: string
          level: number
          trading_skill_score: number
          user_id: string
          username: string
          xp: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
    },
  },
} as const
