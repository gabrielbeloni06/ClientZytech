'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation' 
import { supabase } from '@/lib/supabaseClient'
import { 
  Calendar as CalIcon, Clock, ChevronLeft, ChevronRight, 
  Settings, Save, Plus, X, User, Trash2, AlertCircle, Building
} from 'lucide-react'

export default function AppointmentsPage() {
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
                <CalIcon className="text-purple-500" size={32}/> Agendamentos
            </h1>
            <p className="text-gray-400 mt-1 flex items-center gap-2">
                Gerencie sua disponibilidade e horários.
                {paramOrgId && (
                    <span className="bg-[#9b111e] text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                        <Building size={10}/> Modo Admin: Visualizando Cliente {paramOrgId.slice(0,6)}...
                    </span>
                )}
            </p>
        </div>
        <div className="flex bg-[#111] p-1 rounded-lg border border-[#333]">
            <button 
                onClick={() => setView('calendar')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${view === 'calendar' ? 'bg-[#222] text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Calendário
            </button>
            <button 
                onClick={() => { setView('settings'); loadWeekConfig(); }}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${view === 'settings' ? 'bg-[#222] text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Configurar Padrão
            </button>
        </div>
      </div>

      {view === 'calendar' && (
        <div className="animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold capitalize">
                    {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-[#222] rounded-full"><ChevronLeft/></button>
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-[#222] rounded-full"><ChevronRight/></button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-4">
                {daysOfWeek.map(d => <div key={d} className="text-center text-gray-500 text-sm font-bold uppercase">{d}</div>)}
                
                {getDaysInMonth().map((day, idx) => {
                    if (!day) return <div key={idx}></div>
                    const status = getDayStatus(day)
                    
                    let bgClass = 'bg-[#111] border-[#333] text-gray-400' 
                    if (status === 'open') bgClass = 'bg-green-900/10 border-green-900/30 text-green-400 hover:border-green-500'
                    if (status === 'partial') bgClass = 'bg-yellow-900/10 border-yellow-900/30 text-yellow-400 hover:border-yellow-500'
                    if (status === 'full') bgClass = 'bg-red-900/20 border-red-900/50 text-red-500 hover:border-red-500'

                    return (
                        <button 
                            key={idx} 
                            onClick={() => openDayModal(day)}
                            className={`h-24 rounded-xl border flex flex-col items-center justify-center transition-all relative group ${bgClass}`}
                        >
                            <span className="text-xl font-bold">{day.getDate()}</span>
                            {status === 'full' && <span className="text-[10px] uppercase font-bold mt-1">Lotado</span>}
                            {status === 'partial' && <span className="text-[10px] uppercase font-bold mt-1">Vagas</span>}
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity"></div>
                        </button>
                    )
                })}
            </div>
        </div>
      )}

      {view === 'settings' && (
        <div className="animate-in fade-in max-w-4xl mx-auto">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Settings className="text-purple-500"/> Definir Agenda Semanal Padrão</h3>
            
            <div className="space-y-4">
                {weekConfig.map((dayConfig, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border flex items-center gap-4 transition-colors ${dayConfig.is_active ? 'bg-[#111] border-[#333]' : 'bg-black border-[#222] opacity-60'}`}>
                        <div className="w-32">
                            <span className="font-bold text-lg block">{fullDays[dayConfig.day_of_week]}</span>
                            <button 
                                onClick={() => {
                                    const newConfig = [...weekConfig]
                                    newConfig[idx].is_active = !newConfig[idx].is_active
                                    setWeekConfig(newConfig)
                                }}
                                className={`text-xs font-bold px-2 py-0.5 rounded mt-1 ${dayConfig.is_active ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}
                            >
                                {dayConfig.is_active ? 'ABERTO' : 'FECHADO'}
                            </button>
                        </div>

                        {dayConfig.is_active && (
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Horários Disponíveis (Separe por vírgula)</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-black border border-[#333] rounded p-2 text-sm text-white focus:border-purple-500 outline-none"
                                    placeholder="Ex: 09:00, 10:00, 11:30"
                                    value={dayConfig.slots.join(', ')}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        const newConfig = [...weekConfig]
                                        newConfig[idx].slots = val.split(',').map(s => s.trim()).filter(s => s !== '')
                                        setWeekConfig(newConfig)
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex justify-end mt-8 pt-6 border-t border-[#333]">
                <button onClick={saveWeekConfig} className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-900/20">
                    <Save size={20}/> Salvar Padrão Semanal
                </button>
            </div>
        </div>
      )}

      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[#111] border border-[#333] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-[#333] flex justify-between items-center bg-[#151515]">
                    <div>
                        <h3 className="text-xl font-bold text-white capitalize">
                            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {weekday: 'long', day:'numeric', month:'long'})}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Gerenciamento específico para este dia.</p>
                    </div>
                    <button onClick={() => setSelectedDate(null)}><X className="text-gray-500 hover:text-white"/></button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg border border-[#333]">
                        <span className="font-bold text-gray-300">Dia de Funcionamento?</span>
                        <button 
                            onClick={() => setIsDayClosed(!isDayClosed)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${!isDayClosed ? 'bg-green-900/30 text-green-400 border border-green-900' : 'bg-red-900/30 text-red-400 border border-red-900'}`}
                        >
                            {!isDayClosed ? 'SIM, ESTÁ ABERTO' : 'NÃO, FECHADO HOJE'}
                        </button>
                    </div>

                    {!isDayClosed && (
                        <>
                            <div>
                                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Clock size={16} className="text-blue-500"/> Horários Disponíveis</h4>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {daySlots.map(slot => (
                                        <div key={slot} className="bg-[#222] border border-[#333] px-3 py-1 rounded-lg text-sm flex items-center gap-2 group hover:border-red-900/50 transition-colors">
                                            {slot}
                                            <button onClick={() => removeSlotFromDay(slot)} className="text-gray-600 hover:text-red-500"><X size={12}/></button>
                                        </div>
                                    ))}
                                    {daySlots.length === 0 && <span className="text-gray-500 text-sm italic">Nenhum horário cadastrado.</span>}
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="time" 
                                        className="bg-black border border-[#333] rounded px-3 py-1.5 text-white outline-none focus:border-blue-500"
                                        value={newSlotTime}
                                        onChange={e => setNewSlotTime(e.target.value)}
                                    />
                                    <button onClick={addSlotToDay} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded font-bold">Adicionar</button>
                                </div>
                            </div>

                            <div className="border-t border-[#333] pt-6">
                                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><User size={16} className="text-purple-500"/> Clientes Agendados</h4>
                                {dayBookings.length === 0 ? (
                                    <div className="p-4 border border-dashed border-[#333] rounded-lg text-center text-gray-500 text-sm">Ninguém agendou ainda.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {dayBookings.map(booking => (
                                            <div key={booking.id} className="bg-[#1a1a1a] p-3 rounded-lg flex justify-between items-center">
                                                <div>
                                                    <span className="text-white font-bold text-sm block">{booking.client_name}</span>
                                                    <span className="text-gray-500 text-xs">{booking.service_name} • {new Date(booking.appointment_date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                                                </div>
                                                <button className="text-red-500 hover:bg-red-900/20 p-2 rounded"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-[#333] bg-[#151515] flex justify-end">
                    <button onClick={saveDayOverride} className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                        <Save size={18}/> Salvar Alterações do Dia
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  )
}