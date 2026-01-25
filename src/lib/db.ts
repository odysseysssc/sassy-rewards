import { createServerClient } from './supabase';

// Types
export interface DbUser {
  id: string;
  email: string;
  drip_account_id: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectedCredential {
  id: string;
  user_id: string;
  credential_type: string;
  identifier: string;
  verified: boolean;
  created_at: string;
}

export interface Submission {
  id: string;
  user_id: string;
  platform: string;
  content_url: string;
  content_type: string;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  grit_awarded: number;
  review_note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  submission_type: 'general' | 'shred'; // 'general' for content submissions, 'shred' for Shred the Feed
  reward_type: string | null; // e.g., 'photo', 'short_video', 'unboxing', etc.
  view_count: number | null;
}

export interface GritTransaction {
  id: string;
  email: string;
  amount: number;
  source: string;
  source_reference: string | null;
  claimed: boolean;
  claimed_at: string | null;
  user_id: string | null;
  created_at: string;
}

// User functions
export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !data) return null;
  return data;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data;
}

export async function createUser(
  id: string,
  email: string,
  dripAccountId?: string,
  displayName?: string
): Promise<DbUser> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('users')
    .insert({
      id,
      email: email.toLowerCase(),
      drip_account_id: dripAccountId || null,
      display_name: displayName || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create user: ${error.message}`);
  return data;
}

export async function updateUserDripAccountId(
  userId: string,
  dripAccountId: string
): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('users')
    .update({ drip_account_id: dripAccountId, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw new Error(`Failed to update user: ${error.message}`);
}

export async function updateUserDisplayName(
  userId: string,
  displayName: string
): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('users')
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw new Error(`Failed to update user: ${error.message}`);
}

// Connected credentials functions
export async function getConnectedCredentials(userId: string): Promise<ConnectedCredential[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('connected_credentials')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function addConnectedCredential(
  userId: string,
  credentialType: string,
  identifier: string,
  verified: boolean = false
): Promise<ConnectedCredential> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('connected_credentials')
    .insert({
      user_id: userId,
      credential_type: credentialType,
      identifier: identifier.toLowerCase(),
      verified,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add credential: ${error.message}`);
  return data;
}

export async function findCredentialByIdentifier(
  credentialType: string,
  identifier: string
): Promise<ConnectedCredential | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('connected_credentials')
    .select('*')
    .eq('credential_type', credentialType)
    .eq('identifier', identifier.toLowerCase())
    .single();

  if (error || !data) return null;
  return data;
}

// Submissions functions
export async function createSubmission(
  userId: string,
  platform: string,
  contentUrl: string,
  contentType: string,
  description?: string,
  submissionType: 'general' | 'shred' = 'general'
): Promise<Submission> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('submissions')
    .insert({
      user_id: userId,
      platform,
      content_url: contentUrl,
      content_type: contentType,
      description: description || null,
      submission_type: submissionType,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create submission: ${error.message}`);
  return data;
}

export async function getUserSubmissions(
  userId: string,
  submissionType?: 'general' | 'shred'
): Promise<Submission[]> {
  const supabase = createServerClient();
  let query = supabase
    .from('submissions')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  if (submissionType) {
    query = query.eq('submission_type', submissionType);
  }

  const { data, error } = await query;

  if (error) return [];
  return data || [];
}

export async function hasSubmittedToday(
  userId: string,
  submissionType: 'general' | 'shred' = 'general'
): Promise<boolean> {
  const supabase = createServerClient();

  // Get start of today in UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('submissions')
    .select('id')
    .eq('user_id', userId)
    .eq('submission_type', submissionType)
    .gte('submitted_at', today.toISOString())
    .limit(1);

  if (error) {
    console.error('Error checking daily submission:', error);
    return false; // Allow submission if check fails
  }

  return (data?.length ?? 0) > 0;
}

// Grit transactions functions
export async function createGritTransaction(
  email: string,
  amount: number,
  source: string,
  sourceReference?: string,
  userId?: string,
  claimed: boolean = false
): Promise<GritTransaction> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('grit_transactions')
    .insert({
      email: email.toLowerCase(),
      amount,
      source,
      source_reference: sourceReference || null,
      user_id: userId || null,
      claimed,
      claimed_at: claimed ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create grit transaction: ${error.message}`);
  return data;
}

export async function getPendingGritForEmail(email: string): Promise<GritTransaction[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('grit_transactions')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('claimed', false)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function claimPendingGrit(email: string, userId: string): Promise<number> {
  const supabase = createServerClient();

  // Get unclaimed transactions
  const { data: pending } = await supabase
    .from('grit_transactions')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('claimed', false);

  if (!pending || pending.length === 0) return 0;

  // Mark as claimed
  const { error } = await supabase
    .from('grit_transactions')
    .update({
      claimed: true,
      claimed_at: new Date().toISOString(),
      user_id: userId,
    })
    .eq('email', email.toLowerCase())
    .eq('claimed', false);

  if (error) throw new Error(`Failed to claim grit: ${error.message}`);

  return pending.reduce((sum, t) => sum + t.amount, 0);
}

export async function getTotalPendingGrit(email: string): Promise<number> {
  const pending = await getPendingGritForEmail(email);
  return pending.reduce((sum, t) => sum + t.amount, 0);
}
