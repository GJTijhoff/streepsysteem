import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  Image,
} from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import Svg, { Path, Circle, Line as SvgLine, Text as SvgText } from 'react-native-svg'

type Member = {
  id: string
  display_name: string
  sort_order: number
}

type TimelineRelation = { display_name: string } | { display_name: string }[] | null

type TimelineItem = {
  id: string
  reason: string
  created_at: string
  from_user_id: string
  to_user_id: string
  from_member: TimelineRelation
  to_member: TimelineRelation
}

type TimelineDisplayItem = {
  key: string
  ids: string[]
  reason: string
  created_at: string
  from_name: string
  to_name: string
  aantal: number
}

type StreepjesRow = {
  userId: string
  displayName: string
  streepjes: number
}

type StoredMember = {
  display_name: string
}

type ChartSeries = {
  memberId: string
  name: string
  values: number[]
}

const STORAGE_KEY = 'selected_member'
const bannerImage = require('../assets/members/_GroupsfotoGoed.png')
const bannerImageOffsetY = -70
const bannerImageHeight = '120%'
const baseChartColor = '#166534'
// This is a comment

export default function HomeScreen() {
  const [currentMemberId, setCurrentMemberId] = useState('')
  const [currentUserName, setCurrentUserName] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [streepjesRows, setStreepjesRows] = useState<StreepjesRow[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [reason, setReason] = useState('')
  const [streepjesAantal, setStreepjesAantal] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [message, setMessage] = useState('')
  const [modalMessage, setModalMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteItem, setDeleteItem] = useState<TimelineDisplayItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedChartMemberId, setSelectedChartMemberId] = useState('')

  useEffect(() => {
    loadCurrentUserAndData()
  }, [])

  async function loadCurrentUserAndData() {
    setLoading(true)
    setMessage('')

    const stored = await AsyncStorage.getItem(STORAGE_KEY)

    if (!stored) {
      router.replace('/login')
      return
    }

    const parsed = JSON.parse(stored) as StoredMember
    setCurrentUserName(parsed.display_name)

    const membersResult = await supabase
      .from('members')
      .select('id, display_name, sort_order')
      .order('sort_order', { ascending: true })

    if (membersResult.error) {
      setMessage(membersResult.error.message)
      setLoading(false)
      return
    }

    const memberRows = (membersResult.data as Member[]) || []
    setMembers(memberRows)

    const matchedCurrentMember = memberRows.find(
      (member) => member.display_name === parsed.display_name
    )

    if (!matchedCurrentMember) {
      setMessage('Geselecteerde gebruiker niet gevonden')
      setLoading(false)
      return
    }

    setCurrentMemberId(matchedCurrentMember.id)

    const timelineResult = await supabase
      .from('streepjes')
      .select(`
        id,
        reason,
        created_at,
        from_user_id,
        to_user_id,
        from_member:members!streepjes_from_user_id_fkey(display_name),
        to_member:members!streepjes_to_user_id_fkey(display_name)
      `)
      .order('created_at', { ascending: false })

    if (timelineResult.error) {
      setMessage(timelineResult.error.message)
      setLoading(false)
      return
    }

    const timelineRows = (timelineResult.data as unknown as TimelineItem[]) || []
    setTimeline(timelineRows)
    buildStreepjes(memberRows, timelineRows)
    setLoading(false)
  }

  function buildStreepjes(memberRows: Member[], timelineRows: TimelineItem[]) {
    const map: Record<string, StreepjesRow> = {}

    for (let i = 0; i < memberRows.length; i += 1) {
      const member = memberRows[i]
      map[member.id] = {
        userId: member.id,
        displayName: member.display_name,
        streepjes: 0,
      }
    }

    for (let i = 0; i < timelineRows.length; i += 1) {
      const item = timelineRows[i]
      if (map[item.to_user_id]) {
        map[item.to_user_id].streepjes += 1
      }
    }

    const rows = Object.values(map).sort((a, b) => {
      if (b.streepjes !== a.streepjes) {
        return b.streepjes - a.streepjes
      }
      return a.displayName.localeCompare(b.displayName)
    })

    setStreepjesRows(rows)
  }

  async function refreshAll() {
    const membersResult = await supabase
      .from('members')
      .select('id, display_name, sort_order')
      .order('sort_order', { ascending: true })

    if (membersResult.error) {
      setMessage(membersResult.error.message)
      return
    }

    const timelineResult = await supabase
      .from('streepjes')
      .select(`
        id,
        reason,
        created_at,
        from_user_id,
        to_user_id,
        from_member:members!streepjes_from_user_id_fkey(display_name),
        to_member:members!streepjes_to_user_id_fkey(display_name)
      `)
      .order('created_at', { ascending: false })

    if (timelineResult.error) {
      setMessage(timelineResult.error.message)
      return
    }

    const memberRows = (membersResult.data as Member[]) || []
    const timelineRows = (timelineResult.data as unknown as TimelineItem[]) || []

    setMembers(memberRows)
    setTimeline(timelineRows)
    buildStreepjes(memberRows, timelineRows)
  }

  async function addStreepje() {
    setModalMessage('')
    setMessage('')

    if (!currentMemberId) {
      setModalMessage('Geen gebruiker geselecteerd')
      return
    }

    if (!selectedUserId) {
      setModalMessage('Kies eerst aan wie je een streepje geeft')
      return
    }

    if (selectedUserId === currentMemberId) {
      setModalMessage('Je kunt jezelf geen streepje geven')
      return
    }

    if (!reason.trim()) {
      setModalMessage('Vul een reden in')
      return
    }

    setSaving(true)

    const rows = Array.from({ length: streepjesAantal }, () => ({
      from_user_id: currentMemberId,
      to_user_id: selectedUserId,
      reason: reason.trim(),
    }))

    const result = await supabase.from('streepjes').insert(rows)

    if (result.error) {
      setModalMessage(result.error.message)
      setSaving(false)
      return
    }

    setShowModal(false)
    setSelectedUserId('')
    setReason('')
    setStreepjesAantal(1)
    setModalMessage('')
    setSaving(false)
    await refreshAll()
  }

  async function deleteStreepjesFromTimelineItem() {
    if (!deleteItem || deleteItem.ids.length === 0) {
      return
    }

    setDeleting(true)
    setMessage('')

    const idsToDelete = [...deleteItem.ids]

    const result = await supabase
      .from('streepjes')
      .delete()
      .in('id', idsToDelete)

    if (result.error) {
      setMessage(result.error.message)
      setDeleting(false)
      return
    }

    setShowDeleteModal(false)
    setDeleteItem(null)
    setTimeline((prev) => prev.filter((item) => !idsToDelete.includes(item.id)))
    setDeleting(false)
    await refreshAll()
  }

  async function handleLogout() {
    await AsyncStorage.removeItem(STORAGE_KEY)
    router.replace('/login')
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function formatDay(value: string) {
    return new Date(value).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
    })
  }

  function getSingleName(value: TimelineRelation, fallback: string) {
    if (!value) {
      return fallback
    }

    if (Array.isArray(value)) {
      if (value.length === 0 || !value[0] || !value[0].display_name) {
        return fallback
      }

      return value[0].display_name
    }

    if (!value.display_name) {
      return fallback
    }

    return value.display_name
  }

  const timelineDisplay = useMemo(() => {
    const grouped = new Map<string, TimelineDisplayItem>()

    for (let i = 0; i < timeline.length; i += 1) {
      const item = timeline[i]
      const fromName = getSingleName(item.from_member, 'Onbekend')
      const toName = getSingleName(item.to_member, 'Onbekend')
      const key = `${item.created_at}|${item.from_user_id}|${item.to_user_id}|${item.reason}`

      const existing = grouped.get(key)

      if (existing) {
        existing.aantal += 1
        existing.ids.push(item.id)
      } else {
        grouped.set(key, {
          key,
          ids: [item.id],
          reason: item.reason,
          created_at: item.created_at,
          from_name: fromName,
          to_name: toName,
          aantal: 1,
        })
      }
    }

    return Array.from(grouped.values()).sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [timeline])

  const chartData = useMemo(() => {
    if (timeline.length === 0 || members.length === 0) {
      return {
        labels: [] as string[],
        series: [] as ChartSeries[],
        maxValue: 0,
      }
    }

    const sortedTimeline = [...timeline].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const uniqueDays: string[] = []
    const seenDays = new Set<string>()

    for (let i = 0; i < sortedTimeline.length; i += 1) {
      const day = sortedTimeline[i].created_at.slice(0, 10)
      if (!seenDays.has(day)) {
        seenDays.add(day)
        uniqueDays.push(day)
      }
    }

    const countsByDayAndMember: Record<string, Record<string, number>> = {}

    for (let i = 0; i < uniqueDays.length; i += 1) {
      countsByDayAndMember[uniqueDays[i]] = {}
    }

    for (let i = 0; i < sortedTimeline.length; i += 1) {
      const item = sortedTimeline[i]
      const day = item.created_at.slice(0, 10)

      if (!countsByDayAndMember[day][item.to_user_id]) {
        countsByDayAndMember[day][item.to_user_id] = 0
      }

      countsByDayAndMember[day][item.to_user_id] += 1
    }

    const series: ChartSeries[] = members.map((member) => {
      let running = 0
      const values = uniqueDays.map((day) => {
        running += countsByDayAndMember[day][member.id] || 0
        return running
      })

      return {
        memberId: member.id,
        name: member.display_name,
        values,
      }
    })

    const maxValue = Math.max(
      0,
      ...series.flatMap((serie) => serie.values)
    )

    return {
      labels: uniqueDays,
      series,
      maxValue,
    }
  }, [timeline, members])

  const magVerwijderen =
    currentUserName === 'Hidde' || currentUserName === 'Gert-Jan'

  const chartWidth = Math.max(520, chartData.labels.length * 80)
  const chartHeight = 250
  const chartPaddingLeft = 40
  const chartPaddingRight = 16
  const chartPaddingTop = 20
  const chartPaddingBottom = 42
  const plotWidth = chartWidth - chartPaddingLeft - chartPaddingRight
  const plotHeight = chartHeight - chartPaddingTop - chartPaddingBottom

  function getX(index: number) {
    if (chartData.labels.length <= 1) {
      return chartPaddingLeft + plotWidth / 2
    }

    return chartPaddingLeft + (index / (chartData.labels.length - 1)) * plotWidth
  }

  function getY(value: number) {
    const max = Math.max(1, chartData.maxValue)
    return chartPaddingTop + plotHeight - (value / max) * plotHeight
  }

  function buildPath(values: number[]) {
    if (values.length === 0) {
      return ''
    }

    let path = ''

    for (let i = 0; i < values.length; i += 1) {
      const x = getX(i)
      const y = getY(values[i])

      if (i === 0) {
        path += `M ${x} ${y}`
      } else {
        path += ` L ${x} ${y}`
      }
    }

    return path
  }

  function getSeriesOpacity(memberId: string) {
    if (!selectedChartMemberId) {
      return 0.5
    }

    return selectedChartMemberId === memberId ? 1 : 0.14
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          backgroundColor: '#f8fafc',
        }}
      >
        <Text style={{ fontSize: 18, color: '#334155' }}>Laden...</Text>
      </View>
    )
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: '#f8fafc' }}
        contentContainerStyle={{ padding: 14, gap: 12 }}
      >
        <View
          style={{
            width: '100%',
            height: 450,
            borderRadius: 20,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#e5e7eb',
            backgroundColor: '#dbe4de',
          }}
        >
          <Image
            source={bannerImage}
            resizeMode="cover"
            style={{
              position: 'absolute',
              width: '100%',
              height: bannerImageHeight,
              top: bannerImageOffsetY,
            }}
          />

          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(17,24,39,0.24)',
              justifyContent: 'flex-end',
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 28,
                fontWeight: '700',
                color: 'white',
                textShadowColor: 'rgba(0,0,0,0.35)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
              }}
            >
              Streepsysteem
            </Text>

            <Text
              style={{
                marginTop: 6,
                fontSize: 14,
                color: 'rgba(255,255,255,0.92)',
              }}
            >
              Houd eenvoudig bij wie hoeveel streepjes heeft.
            </Text>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
                marginTop: 12,
              }}
            >
              <View
                style={{
                  backgroundColor: 'rgba(236,253,243,0.94)',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: '#bbf7d0',
                }}
              >
                <Text style={{ color: '#166534', fontWeight: '700' }}>
                  Geselecteerd: {currentUserName}
                </Text>
              </View>

              <Pressable
                onPress={handleLogout}
                style={{
                  backgroundColor: 'rgba(255,241,242,0.97)',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: '#fecdd3',
                }}
              >
                <Text style={{ color: '#be123c', fontWeight: '700' }}>
                  Wissel gebruiker
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 18,
            padding: 14,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            gap: 10,
          }}
        >
          <Pressable
            onPress={() => {
              setSelectedUserId('')
              setReason('')
              setStreepjesAantal(1)
              setModalMessage('')
              setShowModal(true)
            }}
            style={{
              backgroundColor: '#16a34a',
              borderRadius: 14,
              paddingVertical: 13,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
              + Streepje geven
            </Text>
          </Pressable>

          {message ? (
            <Text style={{ color: '#be123c', fontSize: 14 }}>{message}</Text>
          ) : null}
        </View>

        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 18,
            padding: 14,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 19, fontWeight: '700', color: '#111827' }}>
            Stand
          </Text>

          {streepjesRows.map((row, index) => (
            <View
              key={row.userId}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 9,
                paddingHorizontal: 11,
                borderRadius: 12,
                backgroundColor: index === 0 ? '#ecfdf3' : '#fafafa',
                borderWidth: 1,
                borderColor: index === 0 ? '#bbf7d0' : '#ededed',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: index === 0 ? '#16a34a' : '#e5e7eb',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: index === 0 ? 'white' : '#111827', fontWeight: '700' }}>
                    {index + 1}
                  </Text>
                </View>

                <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                  {row.displayName}
                </Text>
              </View>

              <View
                style={{
                  borderRadius: 999,
                  backgroundColor: '#fff1f2',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: '#be123c', fontWeight: '700', fontSize: 13 }}>
                  {row.streepjes} streepjes
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 18,
            padding: 14,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 19, fontWeight: '700', color: '#111827' }}>
            Ontwikkeling per dag
          </Text>

          {chartData.labels.length === 0 ? (
            <Text style={{ color: '#6b7280' }}>Nog geen gegevens voor de grafiek.</Text>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Svg width={chartWidth} height={chartHeight}>
                  {[0, 1, 2, 3, 4].map((step) => {
                    const max = Math.max(1, chartData.maxValue)
                    const value = Math.round((max / 4) * (4 - step))
                    const y = chartPaddingTop + (plotHeight / 4) * step

                    return (
                      <View key={step.toString()} />
                    )
                  })}

                  {[0, 1, 2, 3, 4].map((step) => {
                    const max = Math.max(1, chartData.maxValue)
                    const value = Math.round((max / 4) * (4 - step))
                    const y = chartPaddingTop + (plotHeight / 4) * step

                    return (
                      <SvgLine
                        key={`grid-${step}`}
                        x1={chartPaddingLeft}
                        y1={y}
                        x2={chartWidth - chartPaddingRight}
                        y2={y}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                    )
                  })}

                  {[0, 1, 2, 3, 4].map((step) => {
                    const max = Math.max(1, chartData.maxValue)
                    const value = Math.round((max / 4) * (4 - step))
                    const y = chartPaddingTop + (plotHeight / 4) * step

                    return (
                      <SvgText
                        key={`label-${step}`}
                        x={chartPaddingLeft - 10}
                        y={y + 4}
                        fontSize="11"
                        fill="#64748b"
                        textAnchor="end"
                      >
                        {String(value)}
                      </SvgText>
                    )
                  })}

                  {chartData.labels.map((label, index) => (
                    <SvgText
                      key={`day-${label}`}
                      x={getX(index)}
                      y={chartHeight - 14}
                      fontSize="11"
                      fill="#64748b"
                      textAnchor="middle"
                    >
                      {formatDay(label)}
                    </SvgText>
                  ))}

                  {chartData.series.map((serie) => (
                    <Path
                      key={serie.memberId}
                      d={buildPath(serie.values)}
                      fill="none"
                      stroke={baseChartColor}
                      strokeWidth={selectedChartMemberId === serie.memberId ? 3.5 : 2.4}
                      opacity={getSeriesOpacity(serie.memberId)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}

                  {chartData.series.map((serie) =>
                    serie.values.map((value, index) => (
                      <Circle
                        key={`${serie.memberId}-${index}`}
                        cx={getX(index)}
                        cy={getY(value)}
                        r={selectedChartMemberId === serie.memberId ? 4.2 : 3}
                        fill={baseChartColor}
                        opacity={getSeriesOpacity(serie.memberId)}
                      />
                    ))
                  )}
                </Svg>
              </ScrollView>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                {members.map((member) => {
                  const active = selectedChartMemberId === member.id
                  const dimmed = selectedChartMemberId !== '' && !active

                  return (
                    <Pressable
                      key={member.id}
                      onPress={() => {
                        setSelectedChartMemberId((prev) =>
                          prev === member.id ? '' : member.id
                        )
                      }}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? '#166534' : '#d1d5db',
                        backgroundColor: active ? '#ecfdf3' : '#f8fafc',
                        opacity: dimmed ? 0.35 : 1,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: active ? '700' : '600',
                          color: active ? '#166534' : '#111827',
                        }}
                      >
                        {member.display_name}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </>
          )}
        </View>

        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 18,
            padding: 14,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 19, fontWeight: '700', color: '#111827' }}>
            Tijdlijn
          </Text>

          {timelineDisplay.length === 0 ? (
            <Text style={{ color: '#6b7280' }}>Nog geen streepjes toegevoegd.</Text>
          ) : (
            timelineDisplay.map((item) => (
              <View
                key={item.key}
                style={{
                  borderRadius: 14,
                  padding: 12,
                  backgroundColor: '#fafafa',
                  borderWidth: 1,
                  borderColor: '#ededed',
                  gap: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <View style={{ flex: 1, gap: 8 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
                        {item.from_name} → {item.to_name}
                      </Text>

                      <Text style={{ fontSize: 12, color: '#6b7280' }}>
                        {formatDate(item.created_at)}
                      </Text>
                    </View>

                    <View
                      style={{
                        alignSelf: 'flex-start',
                        borderRadius: 999,
                        backgroundColor: '#ecfdf3',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderWidth: 1,
                        borderColor: '#bbf7d0',
                      }}
                    >
                      <Text style={{ color: '#166534', fontWeight: '700', fontSize: 13 }}>
                        {item.aantal} {item.aantal === 1 ? 'streepje' : 'streepjes'}
                      </Text>
                    </View>

                    <Text style={{ fontSize: 14, color: '#374151' }}>{item.reason}</Text>
                  </View>

                  {magVerwijderen ? (
                    <Pressable
                      onPress={() => {
                        setDeleteItem(item)
                        setShowDeleteModal(true)
                      }}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: '#fff1f2',
                        borderWidth: 1,
                        borderColor: '#fecdd3',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#be123c', fontWeight: '700', fontSize: 18 }}>
                        ×
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.35)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 620,
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: '#e5e7eb',
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: '#111827',
                marginBottom: 6,
              }}
            >
              Streepje geven
            </Text>

            <Text
              style={{
                color: '#6b7280',
                marginBottom: 14,
              }}
            >
              Kies aan wie je een streepje wilt geven.
            </Text>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              {members
                .filter((member) => member.id !== currentMemberId)
                .map((member) => {
                  const selected = selectedUserId === member.id

                  return (
                    <Pressable
                      key={member.id}
                      onPress={() => {
                        setSelectedUserId(member.id)
                        setModalMessage('')
                      }}
                      style={{
                        width: '18%',
                        minWidth: 90,
                        paddingVertical: 12,
                        paddingHorizontal: 8,
                        marginBottom: 10,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: selected ? '#16a34a' : '#d1d5db',
                        backgroundColor: selected ? '#ecfdf3' : '#f8fafc',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          textAlign: 'center',
                          fontWeight: '700',
                          fontSize: 13,
                          color: selected ? '#166534' : '#111827',
                        }}
                      >
                        {member.display_name}
                      </Text>
                    </Pressable>
                  )
                })}
            </View>

            <Text
              style={{
                fontWeight: '700',
                color: '#111827',
                marginBottom: 8,
              }}
            >
              Aantal streepjes
            </Text>

            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                marginBottom: 14,
              }}
            >
              {[1, 2, 3].map((aantal) => {
                const selected = streepjesAantal === aantal

                return (
                  <Pressable
                    key={aantal}
                    onPress={() => setStreepjesAantal(aantal)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: selected ? '#16a34a' : '#d1d5db',
                      backgroundColor: selected ? '#ecfdf3' : '#f8fafc',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: '700',
                        fontSize: 15,
                        color: selected ? '#166534' : '#111827',
                      }}
                    >
                      {aantal}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <Text
              style={{
                fontWeight: '700',
                color: '#111827',
                marginBottom: 8,
              }}
            >
              Reden
            </Text>

            <TextInput
              placeholder="Typ hier de reden..."
              value={reason}
              onChangeText={setReason}
              multiline
              textAlignVertical="top"
              style={{
                borderWidth: 1,
                borderColor: '#d1d5db',
                borderRadius: 14,
                padding: 14,
                minHeight: 140,
                fontSize: 15,
                backgroundColor: '#fafafa',
                marginBottom: 14,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={addStreepje}
                disabled={saving}
                style={{
                  flex: 1,
                  backgroundColor: '#16a34a',
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: 'center',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowModal(false)
                  setModalMessage('')
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#fff1f2',
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#be123c', fontWeight: '700', fontSize: 16 }}>
                  Annuleren
                </Text>
              </Pressable>
            </View>

            {modalMessage ? (
              <Text
                style={{
                  color: '#be123c',
                  textAlign: 'center',
                  fontSize: 14,
                  marginTop: 12,
                }}
              >
                {modalMessage}
              </Text>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.35)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 460,
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 18,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>
              Streepje(s) weghalen
            </Text>

            <Text style={{ fontSize: 15, color: '#374151', lineHeight: 22 }}>
              Weet je zeker dat je{' '}
              <Text style={{ fontWeight: '700' }}>
                {deleteItem?.aantal} {deleteItem?.aantal === 1 ? 'streepje' : 'streepjes'}
              </Text>{' '}
              wilt weghalen van{' '}
              <Text style={{ fontWeight: '700' }}>{deleteItem?.to_name}</Text>?
            </Text>

            <View
              style={{
                backgroundColor: '#fafafa',
                borderWidth: 1,
                borderColor: '#ededed',
                borderRadius: 14,
                padding: 12,
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
                {deleteItem?.from_name} → {deleteItem?.to_name}
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280' }}>
                {deleteItem ? formatDate(deleteItem.created_at) : ''}
              </Text>
              <Text style={{ fontSize: 14, color: '#374151' }}>
                {deleteItem?.reason}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={deleteStreepjesFromTimelineItem}
                disabled={deleting}
                style={{
                  flex: 1,
                  backgroundColor: '#be123c',
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: 'center',
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                  {deleting ? 'Bezig...' : 'Ja, weghalen'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowDeleteModal(false)
                  setDeleteItem(null)
                }}
                disabled={deleting}
                style={{
                  flex: 1,
                  backgroundColor: '#f3f4f6',
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#111827', fontWeight: '700', fontSize: 16 }}>
                  Nee
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}