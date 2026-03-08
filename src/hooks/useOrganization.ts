import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'admin' | 'editor' | 'viewer';
  status: string;
  created_at: string;
  profile?: { name: string | null; email: string | null };
}

export interface OrgInvite {
  id: string;
  organization_id: string;
  email: string | null;
  invite_token: string;
  role: 'admin' | 'editor' | 'viewer';
  status: string;
  created_at: string;
  expires_at: string;
}

export const useOrganization = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchOrgData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get user's organization
    const { data: orgData } = await supabase
      .from('organizations' as any)
      .select('id, user_id')
      .eq('user_id', user.id)
      .single();

    if (!orgData) {
      // Check if user is a member of another org
      const { data: memberData } = await (supabase.from('organization_members' as any) as any)
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .single();

      if (memberData) {
        const memberOrgId = (memberData as any).organization_id;
        setOrgId(memberOrgId);
        // Fetch owner of the org
        const { data: ownerOrg } = await (supabase.from('organizations' as any) as any)
          .select('user_id')
          .eq('id', memberOrgId)
          .single();
        if (ownerOrg) setOwnerId((ownerOrg as any).user_id);
      } else {
        setLoading(false);
        return;
      }
    } else {
      setOrgId((orgData as any).id);
      setOwnerId((orgData as any).user_id);
    }

    const currentOrgId = orgData ? (orgData as any).id : null;
    if (!currentOrgId && !orgId) {
      setLoading(false);
      return;
    }

    const activeOrgId = currentOrgId || orgId;

    // Fetch members
    const { data: membersData } = await (supabase.from('organization_members' as any) as any)
      .select('*')
      .eq('organization_id', activeOrgId)
      .order('created_at', { ascending: true });

    if (membersData) {
      // Fetch profiles for each member
      const userIds = (membersData as any[]).map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);

      const membersWithProfiles = (membersData as any[]).map((m: any) => ({
        ...m,
        profile: profiles?.find((p) => p.user_id === m.user_id) || null,
      }));

      setMembers(membersWithProfiles);
      const currentMember = membersWithProfiles.find((m: any) => m.user_id === user.id);
      setIsAdmin(currentMember?.role === 'admin');
    }

    // Fetch invites
    const { data: invitesData } = await (supabase.from('organization_invites' as any) as any)
      .select('*')
      .eq('organization_id', activeOrgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (invitesData) {
      setInvites(invitesData as any[]);
    }

    setLoading(false);
  }, [user, orgId]);

  useEffect(() => {
    fetchOrgData();
  }, [fetchOrgData]);

  const inviteByEmail = async (email: string, role: 'admin' | 'editor' | 'viewer') => {
    if (!orgId || !user) return { error: 'No organization' };

    const { error } = await (supabase.from('organization_invites' as any) as any).insert({
      organization_id: orgId,
      email,
      role,
      invited_by: user.id,
    });

    if (!error) {
      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .single();

      if (existingProfile) {
        // Auto-add as pending member
        await (supabase.from('organization_members' as any) as any).insert({
          organization_id: orgId,
          user_id: existingProfile.user_id,
          role,
          status: 'pending',
        });
      }

      await fetchOrgData();
    }
    return { error };
  };

  const generateInviteLink = async (role: 'admin' | 'editor' | 'viewer') => {
    if (!orgId || !user) return { error: 'No organization', token: null };

    const { data, error } = await (supabase.from('organization_invites' as any) as any)
      .insert({
        organization_id: orgId,
        role,
        invited_by: user.id,
      })
      .select('invite_token')
      .single();

    if (!error && data) {
      await fetchOrgData();
      return { error: null, token: (data as any).invite_token };
    }
    return { error, token: null };
  };

  const acceptInvite = async (token: string) => {
    if (!user) return { error: 'Not authenticated' };

    // Find the invite
    const { data: invite } = await (supabase.from('organization_invites' as any) as any)
      .select('*')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .single();

    if (!invite) return { error: 'Invalid or expired invite' };

    const inv = invite as any;

    // Add user as member
    const { error: memberError } = await (supabase.from('organization_members' as any) as any)
      .upsert({
        organization_id: inv.organization_id,
        user_id: user.id,
        role: inv.role,
        status: 'accepted',
      }, { onConflict: 'organization_id,user_id' });

    if (memberError) return { error: memberError.message };

    // Mark invite as accepted
    await (supabase.from('organization_invites' as any) as any)
      .update({ status: 'accepted' })
      .eq('id', inv.id);

    await fetchOrgData();
    return { error: null };
  };

  const updateMemberRole = async (memberId: string, role: 'admin' | 'editor' | 'viewer') => {
    const { error } = await (supabase.from('organization_members' as any) as any)
      .update({ role })
      .eq('id', memberId);

    if (!error) await fetchOrgData();
    return { error };
  };

  const removeMember = async (memberId: string) => {
    const { error } = await (supabase.from('organization_members' as any) as any)
      .delete()
      .eq('id', memberId);

    if (!error) await fetchOrgData();
    return { error };
  };

  const cancelInvite = async (inviteId: string) => {
    const { error } = await (supabase.from('organization_invites' as any) as any)
      .delete()
      .eq('id', inviteId);

    if (!error) await fetchOrgData();
    return { error };
  };

  return {
    orgId,
    members,
    invites,
    loading,
    isAdmin,
    inviteByEmail,
    generateInviteLink,
    acceptInvite,
    updateMemberRole,
    removeMember,
    cancelInvite,
    refresh: fetchOrgData,
  };
};
