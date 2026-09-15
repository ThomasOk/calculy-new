export type Json
  = | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never
    };
    Views: {
      [_ in never]: never
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never
    };
    CompositeTypes: {
      [_ in never]: never
    };
  };
  public: {
    Tables: {
      challenge_attempts: {
        Row: {
          answers: Json | null;
          challenge_type: string;
          date: string;
          id: string;
          is_suspicious: boolean | null;
          mistakes: number;
          mode: string;
          problems: Json | null;
          score: number;
          time_ms: number;
          timestamp: string;
          user_id: string;
          validation_checks: Json | null;
        };
        Insert: {
          answers?: Json | null;
          challenge_type: string;
          date: string;
          id?: string;
          is_suspicious?: boolean | null;
          mistakes: number;
          mode: string;
          problems?: Json | null;
          score: number;
          time_ms: number;
          timestamp?: string;
          user_id: string;
          validation_checks?: Json | null;
        };
        Update: {
          answers?: Json | null;
          challenge_type?: string;
          date?: string;
          id?: string;
          is_suspicious?: boolean | null;
          mistakes?: number;
          mode?: string;
          problems?: Json | null;
          score?: number;
          time_ms?: number;
          timestamp?: string;
          user_id?: string;
          validation_checks?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'challenge_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      feature_flags: {
        Row: {
          description: string | null;
          enabled: boolean;
          key: string;
          updated_at: string;
        };
        Insert: {
          description?: string | null;
          enabled?: boolean;
          key: string;
          updated_at?: string;
        };
        Update: {
          description?: string | null;
          enabled?: boolean;
          key?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          updated_at: string;
          username: string;
          username_customized: boolean;
        };
        Insert: {
          created_at?: string;
          id: string;
          updated_at?: string;
          username: string;
          username_customized?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          updated_at?: string;
          username?: string;
          username_customized?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      leaderboard_alltime: {
        Row: {
          best_score: number | null;
          best_score_date: string | null;
          best_time: number | null;
          challenge_type: string | null;
          mistakes: number | null;
          rank: number | null;
          total_challenges: number | null;
          user_id: string | null;
          username: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'challenge_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      leaderboard_daily: {
        Row: {
          challenge_type: string | null;
          completed_at: string | null;
          date: string | null;
          id: string | null;
          mistakes: number | null;
          rank: number | null;
          score: number | null;
          time_ms: number | null;
          user_id: string | null;
          username: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'challenge_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      suspicious_attempts: {
        Row: {
          answers: Json | null;
          challenge_type: string | null;
          date: string | null;
          id: string | null;
          is_suspicious: boolean | null;
          mistakes: number | null;
          mode: string | null;
          score: number | null;
          time_ms: number | null;
          timestamp: string | null;
          too_fast: boolean | null;
          too_perfect: boolean | null;
          user_id: string | null;
          username: string | null;
          validation_checks: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'challenge_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      delete_user_account: { Args: never; Returns: Json };
      is_username_available: {
        Args: { check_username: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never
    };
    CompositeTypes: {
      [_ in never]: never
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
      & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
      ? R
      : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables']
    & DefaultSchema['Views'])
    ? (DefaultSchema['Tables']
      & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
        ? R
        : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema['Tables']
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
    Insert: infer I;
  }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema['Tables']
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
    Update: infer U;
  }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema['Enums']
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema['CompositeTypes']
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
