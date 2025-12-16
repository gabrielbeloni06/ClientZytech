'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation' 
import { supabase } from '@/lib/supabaseClient'
import { 
  Calendar as CalIcon, Clock, ChevronLeft, ChevronRight, 
  Settings, Save, Plus, X, User, Trash2, AlertCircle, Building,
  Sparkles, CheckCircle, Ban, CalendarDays
} from 'lucide-react'

function AppointmentsContent() {
  const searchParams = useSearchParams()
  const paramOrgId = searchParams.get('orgId')

  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState('')
  const [view, setView] = useState<'calendar' | 'settings'>('calendar')
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [monthAppointments, setMonthAppointments] = useState<any[]>([])
  const [dayOverrides, setDayOverrides] = useState<any[]>([])
  const [baseSchedule, setBaseSchedule] = useState<any[]>([])

  const [daySlots, setDaySlots] = useState<string[]>([]) 
  const [dayBookings, setDayBookings] = useState<any[]>([]) 
  const [isDayClosed, setIsDayClosed] = useState(false)
  const [newSlotTime, setNewSlotTime] = useState('')

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (orgId) fetchMonthData()
  }, [currentDate, orgId, view])

  async function loadInitialData() {
    if (paramOrgId) {
        setOrgId(paramOrgId)
        return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
    if (profile?.organization_id) {
        setOrgId(profile.organization_id)
    }
  }

  async function fetchMonthData() {
    setLoading(true)
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString()

    const { data: appts } = await supabase
        .from('appointments')
        .select('*')
        .eq('organization_id', orgId)
        .gte('appointment_date', startOfMonth)
        .lte('appointment_date', endOfMonth)
    
    setMonthAppointments(appts || [])

    const { data: overrides } = await supabase
        .from('day_overrides')
        .select('*')
        .eq('organization_id', orgId)
    setDayOverrides(overrides || [])

    const { data: base } = await supabase
        .from('base_schedules')
        .select('*')
        .eq('organization_id', orgId)
    setBaseSchedule(base || [])

    setLoading(false)
  }

  function getDaysInMonth() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const date = new Date(year, month, 1)
    const days = []
    
    for (let i = 0; i < date.getDay(); i++) {
        days.push(null)
    }
    
    while (date.getMonth() === month) {
        days.push(new Date(date))
        date.setDate(date.getDate() + 1)
    }
    return days
  }

  function getDayStatus(date: Date) {
    if (!date) return 'empty'
    
    const dateStr = date.toISOString().split('T')[0]
    const dayOfWeek = date.getDay()

    const override = dayOverrides.find(o => o.date === dateStr)
    let slots = []
    
    if (override) {
        if (override.is_closed) return 'closed'
        slots = override.slots || []
    } else {
        const base = baseSchedule.find(b => b.day_of_week === dayOfWeek)
        if (!base || !base.is_active) return 'closed' 
        slots = base.slots || []
    }

    if (slots.length === 0) return 'closed'

    const bookingsCount = monthAppointments.filter(a => a.appointment_date.startsWith(dateStr) && a.status !== 'canceled').length
    
    if (bookingsCount >= slots.length) return 'full' 
    if (bookingsCount > 0) return 'partial' 
    return 'open' 
  }

  function openDayModal(date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    setSelectedDate(dateStr)
    
    const dayOfWeek = date.getDay()
    const override = dayOverrides.find(o => o.date === dateStr)
    const base = baseSchedule.find(b => b.day_of_week === dayOfWeek)

    let currentSlots = []
    let closed = false

    if (override) {
        currentSlots = override.slots || []
        closed = override.is_closed
    } else if (base) {
        currentSlots = base.slots || []
        closed = !base.is_active
    } else {
        closed = true 
    }

    setDaySlots(currentSlots)
    setIsDayClosed(closed)

    const bookings = monthAppointments.filter(a => a.appointment_date.startsWith(dateStr))
    setDayBookings(bookings)
  }

  async function saveDayOverride() {
    if (!selectedDate) return
    
    const { error } = await supabase
        .from('day_overrides')
        .upsert({
            organization_id: orgId,
            date: selectedDate,
            slots: daySlots,
            is_closed: isDayClosed
        }, { onConflict: 'organization_id, date' })

    if (error) alert('Erro ao salvar: ' + error.message)
    else {
        fetchMonthData() 
        setSelectedDate(null) 
    }
  }

  async function addSlotToDay() {
    if (!newSlotTime) return
    if (!daySlots.includes(newSlotTime)) {
        const newSlots = [...daySlots, newSlotTime].sort()
        setDaySlots(newSlots)
    }
    setNewSlotTime('')
  }

  async function removeSlotFromDay(slot: string) {
    setDaySlots(daySlots.filter(s => s !== slot))
  }

  const [weekConfig, setWeekConfig] = useState<any[]>([])

  async function loadWeekConfig() {
    const template = [0,1,2,3,4,5,6].map(d => {
        const existing = baseSchedule.find(b => b.day_of_week === d)
        return existing || { day_of_week: d, slots: [], is_active: false, organization_id: orgId }
    })
    setWeekConfig(template)
  }

  async function saveWeekConfig() {
    const { error } = await supabase
        .from('base_schedules')
        .upsert(weekConfig.map(w => ({
            organization_id: orgId,
            day_of_week: w.day_of_week,
            slots: w.slots,
            is_active: w.is_active
        })), { onConflict: 'organization_id, day_of_week' })
    
    if (error) alert('Erro: ' + error.message)
    else {
        alert('Agenda padrão salva com sucesso!')
        fetchMonthData()
        setView('calendar')
    }
  }

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const fullDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

  return (
    <div className="space-y-6 text-white pb-20 relative">
      
      <div className="flex justify-between items-center border-b border-[#333] pb-6">
        <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
                <CalIcon className="text-purple-400" size={32}/> Agendamentos
            </h1>
            <p className="text-gray-400 mt-1 flex items-center gap-2">
                Gerencie sua disponibilidade e visualize marcações.
                {paramOrgId && (
                    <span className="bg-[#9b111e]/20 text-[#9b111e] border border-[#9b111e]/50 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 uppercase font-bold tracking-wider">
                        <Building size={10}/> Modo Admin
                    </span>
                )}
            </p>
        </div>
        <div className="flex bg-[#0a0a0a] p-1.5 rounded-xl border border-white/10 shadow-lg">
            <button 
                onClick={() => setView('calendar')}
                className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 flex items-center gap-2 ${view === 'calendar' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            >
                <CalendarDays size={14} /> Calendário
            </button>
            <button 
                onClick={() => { setView('settings'); loadWeekConfig(); }}
                className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 flex items-center gap-2 ${view === 'settings' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            >
                <Settings size={14} /> Configurar Padrão
            </button>
        </div>
      </div>

      {view === 'calendar' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="flex justify-between items-center mb-8 bg-[#0a0a0a]/50 backdrop-blur-md p-4 rounded-2xl border border-white/5">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-3 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white border border-transparent hover:border-white/10 group">
                    <ChevronLeft className="group-hover:-translate-x-0.5 transition-transform"/>
                </button>
                <h2 className="text-2xl font-bold capitalize text-white flex items-center gap-3">
                    <span className="text-purple-400 opacity-50 text-4xl font-mono">{currentDate.getFullYear()}</span>
                    {currentDate.toLocaleDateString('pt-BR', { month: 'long' })}
                </h2>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-3 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white border border-transparent hover:border-white/10 group">
                    <ChevronRight className="group-hover:translate-x-0.5 transition-transform"/>
                </button>
            </div>

            <div className="grid grid-cols-7 gap-4">
                {daysOfWeek.map(d => (
                    <div key={d} className="text-center text-gray-600 text-xs font-bold uppercase tracking-widest mb-2">{d}</div>
                ))}
                
                {getDaysInMonth().map((day, idx) => {
                    if (!day) return <div key={idx} className="h-28"></div>
                    
                    const status = getDayStatus(day)
                    const isToday = new Date().toDateString() === day.toDateString()
                    
                    let cardStyle = 'bg-[#0a0a0a] border-white/5 text-gray-600 hover:border-white/20' 
                    let statusIndicator = null

                    if (status === 'open') {
                        cardStyle = 'bg-green-500/5 border-green-500/20 text-green-400 hover:border-green-500/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]'
                        statusIndicator = <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
                    }
                    if (status === 'partial') {
                        cardStyle = 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400 hover:border-yellow-500/50 hover:shadow-[0_0_20px_rgba(234,179,8,0.15)]'
                        statusIndicator = <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_#eab308]"></div>
                    }
                    if (status === 'full') {
                        cardStyle = 'bg-red-500/5 border-red-500/20 text-red-400 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                        statusIndicator = <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"></div>
                    }
                    if (status === 'closed') {
                        cardStyle = 'bg-[#050505] border-white/5 text-gray-700 opacity-60 hover:opacity-100 hover:border-white/10'
                        statusIndicator = <div className="absolute top-2 right-2"><Ban size={12}/></div>
                    }

                    return (
                        <button 
                            key={idx} 
                            onClick={() => openDayModal(day)}
                            className={`h-28 rounded-2xl border flex flex-col items-center justify-center transition-all duration-300 relative group overflow-hidden ${cardStyle} ${isToday ? 'ring-1 ring-white/50' : ''}`}
                        >
                            <span className={`text-2xl font-bold ${isToday ? 'text-white' : ''}`}>{day.getDate()}</span>
                            
                            <div className="mt-2 text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                {status === 'open' && 'Disponível'}
                                {status === 'partial' && 'Vagas'}
                                {status === 'full' && 'Lotado'}
                                {status === 'closed' && 'Fechado'}
                            </div>

                            {statusIndicator}
                            
                            {isToday && <div className="absolute bottom-2 text-[8px] bg-white text-black px-1.5 py-0.5 rounded font-bold uppercase">Hoje</div>}
                        </button>
                    )
                })}
            </div>
        </div>
      )}

      {view === 'settings' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
            <div className="bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 text-white">
                    <Settings className="text-blue-500" size={24}/> Configuração Padrão Semanal
                </h3>
                
                <div className="space-y-4">
                    {weekConfig.map((dayConfig, idx) => (
                        <div key={idx} className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row md:items-center gap-6 ${dayConfig.is_active ? 'bg-white/5 border-white/10 hover:border-blue-500/30' : 'bg-black/40 border-white/5 opacity-60'}`}>
                            <div className="flex items-center justify-between md:w-48">
                                <span className="font-bold text-lg text-white">{fullDays[dayConfig.day_of_week]}</span>
                                <button 
                                    onClick={() => {
                                        const newConfig = [...weekConfig]
                                        newConfig[idx].is_active = !newConfig[idx].is_active
                                        setWeekConfig(newConfig)
                                    }}
                                    className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all border ${dayConfig.is_active ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}
                                >
                                    {dayConfig.is_active ? 'ABERTO' : 'FECHADO'}
                                </button>
                            </div>

                            {dayConfig.is_active && (
                                <div className="flex-1 animate-in slide-in-from-left-2 fade-in">
                                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-2 block flex items-center gap-2"><Clock size={10}/> Horários (Separados por vírgula)</label>
                                    <div className="relative group">
                                        <input 
                                            type="text" 
                                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 focus:bg-white/[0.02] outline-none transition-all placeholder:text-gray-700 font-mono"
                                            placeholder="09:00, 10:00, 11:30"
                                            value={dayConfig.slots.join(', ')}
                                            onChange={(e) => {
                                                const val = e.target.value
                                                const newConfig = [...weekConfig]
                                                newConfig[idx].slots = val.split(',').map((s: string) => s.trim())
                                                setWeekConfig(newConfig)
                                            }}
                                        />
                                        <div className="absolute right-3 top-3 text-xs text-gray-600 font-mono pointer-events-none group-focus-within:text-blue-500">
                                            {dayConfig.slots.filter((s: string) => s !== '').length} slots
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex justify-end mt-8 pt-6 border-t border-white/5">
                    <button onClick={saveWeekConfig} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all hover:scale-105 active:scale-95">
                        <Save size={20}/> Salvar Padrão
                    </button>
                </div>
            </div>
        </div>
      )}

      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div>
                        <h3 className="text-xl font-bold text-white capitalize flex items-center gap-2">
                            <CalendarDays size={20} className="text-purple-500"/>
                            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {weekday: 'long', day:'numeric', month:'long'})}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Gerenciamento específico para este dia.</p>
                    </div>
                    <button onClick={() => setSelectedDate(null)} className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-colors"><X size={20}/></button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
                    
                    <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${!isDayClosed ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {!isDayClosed ? <CheckCircle size={20}/> : <Ban size={20}/>}
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">Status do Dia</p>
                                <p className="text-xs text-gray-500">{!isDayClosed ? 'Aceitando agendamentos' : 'Dia bloqueado'}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsDayClosed(!isDayClosed)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${!isDayClosed ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'}`}
                        >
                            {!isDayClosed ? 'ABERTO' : 'FECHADO'}
                        </button>
                    </div>

                    {!isDayClosed && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4">
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-bold text-white flex items-center gap-2"><Clock size={16} className="text-blue-500"/> Horários Disponíveis</h4>
                                    <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-md">{daySlots.length} slots</span>
                                </div>
                                
                                <div className="flex gap-2 mb-4">
                                    <div className="relative flex-1">
                                        <input 
                                            type="time" 
                                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 transition-colors"
                                            value={newSlotTime}
                                            onChange={e => setNewSlotTime(e.target.value)}
                                        />
                                    </div>
                                    <button onClick={addSlotToDay} className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl font-bold border border-white/5 transition-all"><Plus size={20}/></button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {daySlots.map(slot => (
                                        <div key={slot} className="bg-[#1a1a1a] border border-white/5 pl-3 pr-2 py-1.5 rounded-lg text-sm font-mono text-gray-300 flex items-center gap-2 group hover:border-red-500/30 transition-all cursor-default">
                                            {slot}
                                            <button onClick={() => removeSlotFromDay(slot)} className="text-gray-600 hover:text-red-400 p-0.5 hover:bg-red-500/10 rounded transition-colors"><X size={14}/></button>
                                        </div>
                                    ))}
                                    {daySlots.length === 0 && <span className="text-gray-600 text-xs italic w-full text-center py-4 border border-dashed border-white/10 rounded-xl">Nenhum horário cadastrado para este dia.</span>}
                                </div>
                            </div>

                            <div className="border-t border-white/5 pt-6">
                                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><User size={16} className="text-purple-500"/> Clientes Agendados</h4>
                                
                                <div className="space-y-3">
                                    {dayBookings.length === 0 ? (
                                        <div className="p-6 border border-dashed border-white/5 bg-white/[0.01] rounded-2xl text-center text-gray-500 text-xs">Ninguém agendou para este dia ainda.</div>
                                    ) : (
                                        dayBookings.map((booking: any) => (
                                            <div key={booking.id} className="bg-white/5 border border-white/5 p-4 rounded-xl flex justify-between items-center group hover:bg-white/10 transition-colors">
                                                <div>
                                                    <span className="text-white font-bold text-sm block">{booking.client_name}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-purple-400 text-xs bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">{booking.service_name}</span>
                                                        <span className="text-gray-500 text-xs font-mono">{new Date(booking.appointment_date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${booking.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                                    <button className="text-gray-600 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/5 bg-[#050505]">
                    <button onClick={saveDayOverride} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]">
                        <Save size={18}/> Salvar Alterações do Dia
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  )
}

export default function AppointmentsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#020202] text-blue-500 animate-pulse font-mono">Carregando agendamentos...</div>}>
            <AppointmentsContent />
        </Suspense>
    )
}