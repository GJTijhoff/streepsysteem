import { useMemo, useState, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  ImageBackground,
  useWindowDimensions,
  ScrollView,
  SafeAreaView,
  Modal,
  TextInput,
} from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

const members = [
  { name: 'Rosa', image: require('../assets/members/rosa.png') },
  { name: 'Hidde', image: require('../assets/members/hidde.png') },
  { name: 'Siebe', image: require('../assets/members/siebe.png') },
  { name: 'Annika', image: require('../assets/members/annika.png') },
  { name: 'Eva', image: require('../assets/members/eva.png') },
  { name: 'Isa', image: require('../assets/members/isa.png') },
  { name: 'Lotte', image: require('../assets/members/lotte.png') },
  { name: 'Thijs', image: require('../assets/members/thijs.png') },
  { name: 'Wouda', image: require('../assets/members/wouda.png') },
  { name: 'Gert-Jan', image: require('../assets/members/gertjan.png') },
]

const STORAGE_KEY = 'selected_member'
const ADMIN_PASSWORD = 'vobaas63'
const protectedNames = ['Hidde', 'Gert-Jan']

export default function LoginScreen() {
  const [selectedName, setSelectedName] = useState('')
  const [message, setMessage] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const { width } = useWindowDimensions()

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Streepsysteem | Login'
    }
  }, [])

  const layout = useMemo(() => {
    const screenPadding = width < 420 ? 12 : 24
    const cardPadding = width < 420 ? 14 : 24
    const tileGap = width < 420 ? 8 : 12
    const containerWidth = Math.min(width - screenPadding * 2, 760)

    let columns = 5
    if (width < 700) columns = 4
    if (width < 520) columns = 2

    const tileSize =
      (containerWidth - cardPadding * 2 - tileGap * (columns - 1)) / columns

    return {
      screenPadding,
      cardPadding,
      tileGap,
      tileSize,
      containerWidth,
    }
  }, [width])

  async function continueAsSelectedUser() {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        display_name: selectedName,
      })
    )

    setShowPasswordModal(false)
    setPassword('')
    setPasswordMessage('')
    router.replace('/home')
  }

  async function handleContinue() {
    setMessage('')

    if (!selectedName) {
      setMessage('Kies eerst je naam')
      return
    }

    if (protectedNames.includes(selectedName)) {
      setPassword('')
      setPasswordMessage('')
      setShowPasswordModal(true)
      return
    }

    await continueAsSelectedUser()
  }

  async function handlePasswordSubmit() {
    setPasswordMessage('')

    if (password !== ADMIN_PASSWORD) {
      setPasswordMessage('Onjuist wachtwoord')
      return
    }

    await continueAsSelectedUser()
  }

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1526401485004-2fda9f2c4d4b' }}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.42)',
            padding: layout.screenPadding,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              width: '100%',
              maxWidth: layout.containerWidth,
              backgroundColor: 'white',
              borderRadius: 24,
              padding: layout.cardPadding,
              borderWidth: 1,
              borderColor: '#e5e7eb',
            }}
          >
            <Text
              style={{
                fontSize: width < 420 ? 26 : 30,
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: 8,
                color: '#111827',
              }}
            >
              Streepsysteem
            </Text>

            <Text
              style={{
                textAlign: 'center',
                color: '#374151',
                fontSize: width < 420 ? 15 : 16,
                marginBottom: 4,
              }}
            >
              Kies je naam
            </Text>

            <Text
              style={{
                textAlign: 'center',
                color: '#6b7280',
                fontSize: 14,
                marginBottom: 20,
              }}
            >
              Klik op je naam om verder te gaan
            </Text>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                marginBottom: 18,
                marginHorizontal: -layout.tileGap / 2,
              }}
            >
              {members.map((member) => {
                const selected = selectedName === member.name

                return (
                  <Pressable
                    key={member.name}
                    onPress={() => {
                      setSelectedName(member.name)
                      setMessage('')
                    }}
                    style={{
                      width: layout.tileSize,
                      height: layout.tileSize,
                      borderRadius: 16,
                      overflow: 'hidden',
                      backgroundColor: '#e5e7eb',
                      marginHorizontal: layout.tileGap / 2,
                      marginBottom: layout.tileGap,
                    }}
                  >
                    <ImageBackground
                      source={member.image}
                      resizeMode="cover"
                      imageStyle={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 16,
                      }}
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                          borderRadius: 16,
                          borderWidth: 2,
                          borderColor: selected ? '#16a34a' : '#d1d5db',
                          backgroundColor: selected ? 'rgba(22,163,74,0.30)' : 'rgba(0,0,0,0.26)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 8,
                        }}
                      >
                        <Text
                          style={{
                            textAlign: 'center',
                            fontSize: width < 420 ? 13 : 15,
                            fontWeight: '700',
                            color: 'white',
                            textShadowColor: 'rgba(0,0,0,0.55)',
                            textShadowOffset: { width: 0, height: 1 },
                            textShadowRadius: 4,
                          }}
                        >
                          {member.name}
                        </Text>
                      </View>
                    </ImageBackground>
                  </Pressable>
                )
              })}
            </View>

            <View
              style={{
                backgroundColor: '#f0fdf4',
                borderWidth: 1,
                borderColor: '#bbf7d0',
                borderRadius: 14,
                paddingVertical: 10,
                paddingHorizontal: 12,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  color: '#166534',
                  fontWeight: '600',
                }}
              >
                {selectedName ? `Geselecteerd: ${selectedName}` : 'Nog niemand geselecteerd'}
              </Text>
            </View>

            <Pressable
              onPress={handleContinue}
              style={{
                backgroundColor: '#111827',
                paddingVertical: 15,
                borderRadius: 14,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: 'white',
                  fontWeight: '700',
                  fontSize: 16,
                }}
              >
                Verder
              </Text>
            </Pressable>

            {message ? (
              <Text
                style={{
                  color: '#be123c',
                  textAlign: 'center',
                  fontSize: 14,
                  marginTop: 14,
                }}
              >
                {message}
              </Text>
            ) : null}
          </View>
        </ScrollView>

        <Modal visible={showPasswordModal} transparent animationType="fade">
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.35)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: width < 420 ? 12 : 16,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 420,
                backgroundColor: 'white',
                borderRadius: 20,
                padding: width < 420 ? 14 : 18,
                borderWidth: 1,
                borderColor: '#e5e7eb',
              }}
            >
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: 8,
                }}
              >
                Wachtwoord nodig
              </Text>

              <Text
                style={{
                  fontSize: 15,
                  color: '#374151',
                  marginBottom: 12,
                }}
              >
                Voor {selectedName} is een wachtwoord vereist.
              </Text>

              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Voer wachtwoord in"
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 14,
                  padding: 14,
                  fontSize: 15,
                  backgroundColor: '#fafafa',
                  marginBottom: 12,
                }}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={handlePasswordSubmit}
                  style={{
                    flex: 1,
                    backgroundColor: '#111827',
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                    Doorgaan
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowPasswordModal(false)
                    setPassword('')
                    setPasswordMessage('')
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: '#f3f4f6',
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#111827', fontWeight: '700', fontSize: 16 }}>
                    Annuleren
                  </Text>
                </Pressable>
              </View>

              {passwordMessage ? (
                <Text
                  style={{
                    color: '#be123c',
                    textAlign: 'center',
                    fontSize: 14,
                    marginTop: 12,
                  }}
                >
                  {passwordMessage}
                </Text>
              ) : null}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  )
}