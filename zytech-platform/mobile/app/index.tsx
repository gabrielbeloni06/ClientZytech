import React, { useState, useEffect } from 'react';
import { Text, View, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, SafeAreaView, Platform, Alert } from 'react-native';
// 1. IMPORTAÇÃO ATUALIZADA AQUI:
import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// --- CONFIGURAÇÃO ---
// Coloque aqui o link do seu site na Vercel (SEM BARRA NO FINAL)
const WEBSITE_URL = "https://clientzytech.com.br"; 

// --- COMPONENTES DAS TELAS ---

// 1. TELA DE LOGIN
function LoginScreen({ onLogin, loading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={s.container}>
      <View style={s.logoContainer}>
        <Ionicons name="cube-outline" size={60} color="#3b82f6" />
        <Text style={s.logo}>Zytech Mobile</Text>
        <Text style={s.subLogo}>Gestão na palma da mão</Text>
      </View>
      
      <View style={s.form}>
        <TextInput 
          placeholder="Email Corporativo" 
          placeholderTextColor="#666"
          style={s.input} 
          onChangeText={setEmail} 
          value={email}
          autoCapitalize='none'
          keyboardType='email-address'
        />
        <TextInput 
          placeholder="Senha" 
          placeholderTextColor="#666"
          secureTextEntry 
          style={s.input} 
          onChangeText={setPassword} 
          value={password}
        />
        <TouchableOpacity style={s.btn} onPress={() => onLogin(email, password)}>
           {loading ? <ActivityIndicator color="#fff"/> : <Text style={s.btnText}>ACESSAR PAINEL</Text>}
        </TouchableOpacity>
      </View>
      <Text style={s.footer}>v1.0.1 • Clientzy System</Text>
    </View>
  );
}

// 2. TELA DASHBOARD (HOME)
function DashboardScreen({ supabase, user }) {
  const [stats, setStats] = useState({ messages: 0, appointments: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    setErrorMsg('');
    
    // Busca Perfil
    const { data: profile, error } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    
    if (error || !profile?.organization_id) { 
        setLoading(false); 
        // Se for admin sem org, avisa
        setErrorMsg('Este usuário não está vinculado a uma organização/cliente. (Modo Admin não suportado no App)');
        return; 
    }

    const orgId = profile.organization_id;
    const today = new Date().toISOString().split('T')[0];
    
    // Busca contagem de mensagens
    const { count: msgCount } = await supabase.from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .gte('created_at', today);

    // Busca agendamentos
    const { count: apptCount } = await supabase.from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'confirmed');

    setStats({ messages: msgCount || 0, appointments: apptCount || 0 });
    setLoading(false);
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.header}>
        <View>
            <Text style={s.headerSubtitle}>Bem-vindo,</Text>
            <Text style={s.headerTitle}>{user.email.split('@')[0]}</Text>
        </View>
        <TouchableOpacity onPress={fetchStats} style={s.refreshBtn}><Ionicons name="refresh" size={20} color="#fff"/></TouchableOpacity>
      </View>
      
      {errorMsg ? (
          <View style={[s.content, { flexDirection: 'column' }]}>
              <View style={[s.card, { borderColor: '#ef4444' }]}>
                  <Ionicons name="warning" size={32} color="#ef4444" style={{marginBottom: 10}}/>
                  <Text style={{color: '#fff', textAlign: 'center'}}>{errorMsg}</Text>
              </View>
          </View>
      ) : (
          <View style={s.content}>
            <View style={[s.card, { borderLeftColor: '#3b82f6' }]}>
                <View style={s.cardIcon}><Ionicons name="chatbubbles" size={24} color="#3b82f6" /></View>
                <Text style={s.cardValue}>{loading ? '...' : stats.messages}</Text>
                <Text style={s.cardLabel}>Mensagens Hoje</Text>
            </View>

            <View style={[s.card, { borderLeftColor: '#a855f7' }]}>
                <View style={s.cardIcon}><Ionicons name="calendar" size={24} color="#a855f7" /></View>
                <Text style={s.cardValue}>{loading ? '...' : stats.appointments}</Text>
                <Text style={s.cardLabel}>Agendamentos</Text>
            </View>
          </View>
      )}
      
      <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={s.infoText}>As notificações push estão ativas para este dispositivo.</Text>
      </View>
    </SafeAreaView>
  );
}

// 3. TELA DE CHAT
function ChatListScreen({ supabase, user }) {
  const [chats, setChats] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadChats();
  }, []);

  async function loadChats() {
    setRefreshing(true);
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (!profile) { setRefreshing(false); return; }

    const { data } = await supabase
        .from('chat_messages')
        .select('phone, content, created_at, sender_name, role')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
        .limit(50);
    
    if (data) {
        const uniqueMap = new Map();
        data.forEach(msg => {
            if (!uniqueMap.has(msg.phone)) uniqueMap.set(msg.phone, msg);
        });
        setChats(Array.from(uniqueMap.values()));
    }
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={s.safeArea}>
       <View style={s.header}>
        <Text style={s.headerTitle}>Conversas</Text>
      </View>
      <FlatList
        data={chats}
        keyExtractor={item => item.phone}
        refreshing={refreshing}
        onRefresh={loadChats}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={<Text style={{color: '#555', textAlign: 'center', marginTop: 50}}>Nenhuma conversa recente.</Text>}
        renderItem={({ item }) => (
          <View style={s.chatItem}>
             <View style={s.avatar}>
                <Text style={s.avatarText}>{(item.sender_name?.[0] || item.phone?.[0] || '?').toUpperCase()}</Text>
             </View>
             <View style={{flex: 1}}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <Text style={s.chatName}>{item.sender_name || item.phone}</Text>
                    <Text style={s.chatTime}>{new Date(item.created_at).getHours()}:{String(new Date(item.created_at).getMinutes()).padStart(2,'0')}</Text>
                </View>
                <Text style={s.chatMsg} numberOfLines={1}>
                    {item.role === 'assistant' ? '🤖 ' : ''}{item.content}
                </Text>
             </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

// 4. TELA DE PERFIL (SAIR)
function ProfileScreen({ user, onLogout }) {
    return (
        <SafeAreaView style={[s.safeArea, {justifyContent: 'center', alignItems: 'center'}]}>
            <View style={s.profileCard}>
                <View style={s.largeAvatar}><Text style={s.largeAvatarText}>{user.email[0].toUpperCase()}</Text></View>
                <Text style={s.profileEmail}>{user.email}</Text>
                
                <TouchableOpacity style={s.logoutBtn} onPress={onLogout}>
                    <Text style={s.logoutText}>Sair da Conta</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}

// --- NAVEGAÇÃO INTERNA ---
const Tab = createBottomTabNavigator();

// 2. CORREÇÃO PRINCIPAL AQUI:
function MainApp({ supabase, user, onLogout }) {
    return (
        <NavigationIndependentTree>
            <NavigationContainer>
                <Tab.Navigator
                    screenOptions={({ route }) => ({
                    headerShown: false,
                    tabBarStyle: { 
                        backgroundColor: '#0a0a0a', 
                        borderTopColor: '#222',
                        height: 60,
                        paddingBottom: 8,
                        paddingTop: 8
                    },
                    tabBarActiveTintColor: '#3b82f6',
                    tabBarInactiveTintColor: '#555',
                    tabBarIcon: ({ color, size }) => {
                        let iconName;
                        if (route.name === 'Dashboard') iconName = 'stats-chart';
                        else if (route.name === 'Conversas') iconName = 'chatbubbles';
                        else if (route.name === 'Perfil') iconName = 'person';
                        return <Ionicons name={iconName} size={size} color={color} />;
                    },
                    })}
                >
                    <Tab.Screen name="Dashboard">{() => <DashboardScreen supabase={supabase} user={user} />}</Tab.Screen>
                    <Tab.Screen name="Conversas">{() => <ChatListScreen supabase={supabase} user={user} />}</Tab.Screen>
                    <Tab.Screen name="Perfil">{() => <ProfileScreen user={user} onLogout={onLogout} />}</Tab.Screen>
                </Tab.Navigator>
            </NavigationContainer>
        </NavigationIndependentTree>
    );
}

// --- ROOT COMPONENT (ENTRY POINT) ---
export default function Index() {
  const [supabase, setSupabase] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);

  // 1. Setup Inicial
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`${WEBSITE_URL}/api/mobile-config`);
        const config = await res.json();
        
        if (config.supabaseUrl) {
            const client = createClient(config.supabaseUrl, config.supabaseKey);
            setSupabase(client);
            
            // Check session
            const { data } = await client.auth.getSession();
            if (data.session) setUser(data.session.user);
            
            setReady(true);
        } else {
            Alert.alert("Erro", "Não foi possível carregar as configurações do servidor.");
        }
      } catch (e) {
        Alert.alert("Erro de Conexão", "Verifique sua internet ou a URL do servidor.");
      }
    }
    init();
  }, []);

  // 2. Login (COM TRIM E TRATAMENTO DE ERRO)
  const handleLogin = async (email, password) => {
    if (!supabase) return;
    if (!email || !password) {
        Alert.alert("Campos vazios", "Digite seu e-mail e senha.");
        return;
    }

    setLoadingLogin(true);
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    const { data, error } = await supabase.auth.signInWithPassword({ 
        email: cleanEmail, 
        password: cleanPassword 
    });
    
    if (error) {
        Alert.alert("Erro no Login", error.message);
        setLoadingLogin(false);
    } else {
        setUser(data.user);
        setLoadingLogin(false);
        registerPushToken(data.user.id, supabase);
    }
  };
  
  // 3. Logout
  const handleLogout = async () => {
      await supabase.auth.signOut();
      setUser(null);
  }

  // 4. Registro de Push
  const registerPushToken = async (userId, sb) => {
    try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
            const { status: newStatus } = await Notifications.requestPermissionsAsync();
            if (newStatus !== 'granted') return;
        }
        
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        
        const { data: profile } = await sb.from('profiles').select('organization_id').eq('id', userId).single();
        
        if (profile) {
            await sb.from('user_push_tokens').upsert({
                user_id: userId,
                organization_id: profile.organization_id,
                token: tokenData.data,
                device_type: Platform.OS
            }, { onConflict: 'token' });
        }
    } catch (e) {
        console.log("Erro Push:", e);
    }
  };

  if (!ready) {
      return (
          <View style={s.center}>
              <ActivityIndicator size="large" color="#3b82f6"/>
              <Text style={{color: '#555', marginTop: 20}}>Conectando ao Clientzy...</Text>
          </View>
      );
  }

  if (!user) return <LoginScreen onLogin={handleLogin} loading={loadingLogin} />;

  return <MainApp supabase={supabase} user={user} onLogout={handleLogout} />;
}

// --- ESTILOS ---
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 30 },
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  safeArea: { flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  
  // Login
  logoContainer: { alignItems: 'center', marginBottom: 50 },
  logo: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 10 },
  subLogo: { color: '#666', fontSize: 14 },
  form: { width: '100%' },
  input: { backgroundColor: '#111', color: '#fff', padding: 16, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#222', fontSize: 16 },
  btn: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, shadowColor: '#3b82f6', shadowOpacity: 0.3, shadowRadius: 10 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  footer: { position: 'absolute', bottom: 40, alignSelf: 'center', color: '#333', fontSize: 10 },

  // Dashboard
  header: { paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: '#888', fontSize: 12 },
  refreshBtn: { padding: 8, backgroundColor: '#1a1a1a', borderRadius: 8 },
  content: { padding: 20, flexDirection: 'row', gap: 15 },
  card: { flex: 1, backgroundColor: '#0f0f11', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#222', borderLeftWidth: 4 },
  cardValue: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginVertical: 8 },
  cardLabel: { color: '#666', fontSize: 12, fontWeight: '600' },
  cardIcon: { padding: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, marginBottom: 5 },
  infoBox: { margin: 20, marginTop: 0, padding: 15, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 10, flexDirection: 'row', gap: 10, alignItems: 'center' },
  infoText: { color: '#3b82f6', fontSize: 12, flex: 1 },

  // Chat
  chatItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', alignItems: 'center' },
  avatar: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: '#333' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  chatName: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  chatMsg: { color: '#888', fontSize: 13, marginTop: 3 },
  chatTime: { color: '#555', fontSize: 11 },
  
  // Profile
  profileCard: { width: '80%', backgroundColor: '#111', borderRadius: 20, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  largeAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  largeAvatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  profileEmail: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 5 },
  profileRole: { color: '#666', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 30 },
  logoutBtn: { width: '100%', padding: 15, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  logoutText: { color: '#ef4444', fontWeight: 'bold' }
});