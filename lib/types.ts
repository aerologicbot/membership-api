export type MembershipStatus = "ACTIVE" | "EXPIRED";

export type Membership = {
  id: string;
  telegram_phone: string;
  telegram_user_id: number | null;
  package: string;
  status: MembershipStatus;
  started_at: string;
  expired_at: string;
  created_at: string;
  updated_at: string;
  kick_processed_at: string | null;
  kick_last_error: string | null;
};

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    from?: { id: number; first_name?: string };
    text?: string;
    contact?: { phone_number: string; user_id?: number };
  };
  chat_member?: {
    chat: { id: number };
    from: { id: number };
    invite_link?: { invite_link: string };
    new_chat_member: { user: { id: number }; status: string };
  };
};
