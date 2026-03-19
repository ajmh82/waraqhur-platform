export interface EmailAddress {
  email: string;
  name?: string | null;
}

export interface EmailMessage {
  to: EmailAddress;
  subject: string;
  text: string;
  html?: string | null;
}

export interface EmailSendResult {
  success: boolean;
  provider: string;
  messageId: string;
}

export interface EmailService {
  send(message: EmailMessage): Promise<EmailSendResult>;
}
