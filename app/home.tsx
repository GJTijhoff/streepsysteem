import { useEffect, useState } from 'react'
import { View, Text, Pressable, TextInput, Modal, ScrollView } from 'react-native'
import { supabase } from '../lib/supabase'

type Profile = {
  id: string
  display_name: string
}

type TimelineItem = {
  id: string
  reason: string
  created_at: string
  from_profile: { display_name: string } | null
  to_profile: { display_name: string } | null
}

type ScoreRow = {
  userId: string
  displayName: string
  score: number
}

export default function HomeScreen() {
  const [currentUserId, setCurrentUserId] = useState('')
  const [currentUserName, setCurrentUserName] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [scores, setScores] = useState<ScoreRow[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [reason, setReason] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [message, setMessage] = useState('')

  async function loadCurrentUser() {
    const result = await supabase.auth.getUser()

    if (result.error || !result.data.user) {
      setMessage(result.error ? result.error.message : 'No user found')
      return
    }

    const userId = result.data.user.id
    setCurrentUserId(userId)

    const profileResult = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('id', userId)
      .single()

    if (!profileResult.error && profileResult.data) {
      setCurrentUserName(profileResult.data.display_name)
    }
  }

  async function loadProfiles() {
    const result = await supabase
      .from('profiles')
      .select('id, display_name')
      .order('display_name', { ascending: true })

    if (result.error) {
      setMessage(result.error.message)
      return
    }

    setProfiles(result.data || [])
  }

  async function loadTimeline() {
    const result = await supabase
      .from('streepjes')
      .select(`
        id,
        reason,
        created_at,
        from_profile:profiles!streepjes_from_user_id_fkey(display_name),
        to_profile:profiles!streepjes_to_user_id_fkey(display_name)
      `)
      .order('created_at', { ascending: false })

    if (result.error) {
      setMessage(result.error.message)
      return
    }

    setTimeline((result.data as unknown as TimelineItem[]) || [])
  }

  function buildScores(profileRows: Profile[], timelineRows: TimelineItem[]) {
    const map: Record<string, ScoreRow> = {}

    for (let i = 0; i < profileRows.length; i += 1) {
      const profile = profileRows[i]
      map[profile.id] = {
        userId: profile.id,
        displayName: profile.display_name,
        score: 0,
      }
    }

    for (let i = 0; i < timelineRows.length; i += 1) {
      const item = timelineRows[i]
      const toName = item.to_profile && item.to_profile.display_name ? item.to_profile.display_name : 'Unknown'

      const matchedProfile = profileRows.find((p) => p.display_name === toName)
      if (matchedProfile) {
        map[matchedProfile.id].score += 1
      }
    }

    const rows = Object.values(map).sort((a, b) => b.score - a.score)
    setScores(rows)
  }

  async function refreshAll() {
    const profileResult = await supabase
      .from('profiles')
      .select('id, display_name')
      .order('display_name', { ascending: true })

    if (profileResult.error) {
      setMessage(profileResult.error.message)
      return
    }

    const timelineResult = await supabase
      .from('streepjes')
      .select(`
        id,
        reason,
        created_at,
        from_profile:profiles!streepjes_from_user_id_fkey(display_name),
        to_profile:profiles!streepjes_to_user_id_fkey(display_name)
      `)
      .order('created_at', { ascending: false })

    if (timelineResult.error) {
      setMessage(timelineResult.error.message)
      return
    }

    const profileRows = (profileResult.data as Profile[]) || []
    const timelineRows = (timelineResult.data as unknown as TimelineItem[]) || []

    setProfiles(profileRows)
    setTimeline(timelineRows)
    buildScores(profileRows, timelineRows)
  }

  async function addStreepje() {
    setMessage('')

    if (!currentUserId) {
      setMessage('No logged-in user found')
      return
    }

    if (!selectedUserId) {
      setMessage('Select a member')
      return
    }

    if (selectedUserId === currentUserId) {
      setMessage('You cannot give yourself a streepje')
      return
    }

    if (!reason.trim()) {
      setMessage('Enter a reason')
      return
    }

    const result = await supabase.from('streepjes').insert({
      from_user_id: currentUserId,
      to_user_id: selectedUserId,
      reason: reason.trim(),
    })

    if (result.error) {
      setMessage(result.error.message)
      return
    }

    setShowModal(false)
    setSelectedUserId('')
    setReason('')
    await refreshAll()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  useEffect(() => {
    loadCurrentUser()
    refreshAll()
  }, [])

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: '600' }}>Streepsysteem</Text>
      <Text style={{ fontSize: 18 }}>Logged in as: {currentUserName || 'Unknown user'}</Text>

      <Pressable
        onPress={() => {
          setSelectedUserId('')
          setReason('')
          setShowModal(true)
        }}
        style={{ padding: 14, borderWidth: 1, borderRadius: 8, alignItems: 'center' }}
      >
        <Text>Add streepje</Text>
      </Pressable>

      <Pressable
        onPress={handleLogout}
        style={{ padding: 14, borderWidth: 1, borderRadius: 8, alignItems: 'center' }}
      >
        <Text>Logout</Text>
      </Pressable>

      <Text style={{ fontSize: 22, fontWeight: '600' }}>Members</Text>

      {scores.map((row) => (
        <View
          key={row.userId}
          style={{ borderWidth: 1, borderRadius: 8, padding: 12, gap: 4 }}
        >
          <Text style={{ fontSize: 18 }}>{row.displayName}</Text>
          <Text>Score: {row.score}</Text>
        </View>
      ))}

      <Text style={{ fontSize: 22, fontWeight: '600', marginTop: 8 }}>Timeline</Text>

      {timeline.map((item) => (
        <View
          key={item.id}
          style={{ borderWidth: 1, borderRadius: 8, padding: 12, gap: 4 }}
        >
          <Text>
            {(item.from_profile && item.from_profile.display_name) || 'Unknown'} → {(item.to_profile && item.to_profile.display_name) || 'Unknown'}
          </Text>
          <Text>{item.reason}</Text>
          <Text>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
      ))}

      {message ? <Text>{message}</Text> : null}

      <Modal visible={showModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.35)',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 22, fontWeight: '600' }}>Give streepje</Text>

            {profiles
              .filter((profile) => profile.id !== currentUserId)
              .map((profile) => (
                <Pressable
                  key={profile.id}
                  onPress={() => setSelectedUserId(profile.id)}
                  style={{ padding: 12, borderWidth: 1, borderRadius: 8 }}
                >
                  <Text>
                    {selectedUserId === profile.id ? '✓ ' : ''}
                    {profile.display_name}
                  </Text>
                </Pressable>
              ))}

            <TextInput
              placeholder="Reason"
              value={reason}
              onChangeText={setReason}
              style={{ borderWidth: 1, padding: 12, borderRadius: 8 }}
            />

            <Pressable
              onPress={addStreepje}
              style={{ padding: 14, borderWidth: 1, borderRadius: 8, alignItems: 'center' }}
            >
              <Text>Save</Text>
            </Pressable>

            <Pressable
              onPress={() => setShowModal(false)}
              style={{ padding: 14, borderWidth: 1, borderRadius: 8, alignItems: 'center' }}
            >
              <Text>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}