"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import AppHeader from "@/components/AppHeader"
import { ui } from "@/lib/ui"

export default function AdminStorePage(){

const [open,setOpen]=useState("18:00")
const [close,setClose]=useState("23:30")
const [closed,setClosed]=useState(false)
const [saving,setSaving]=useState(false)

async function load(){

const {data}=await supabase
.from("store_settings")
.select("*")
.single()

if(!data) return

setOpen(data.open_time)
setClose(data.close_time)
setClosed(data.force_closed)

}

useEffect(()=>{load()},[])

async function save(){

setSaving(true)

await supabase
.from("store_settings")
.update({
open_time:open,
close_time:close,
force_closed:closed
})
.eq("id",1)

setSaving(false)

alert("Configuração salva")

}

return(
<>
<AppHeader/>

<main style={ui.appBg}>
<section style={ui.page}>

<h1 style={ui.title}>Horário da Loja</h1>

<div style={ui.section}>

<label style={{color:"#fff"}}>

Abrir pedidos

<input
type="time"
value={open}
onChange={e=>setOpen(e.target.value)}
style={ui.input}
/>

</label>

<label style={{color:"#fff"}}>

Fechar pedidos

<input
type="time"
value={close}
onChange={e=>setClose(e.target.value)}
style={ui.input}
/>

</label>

<label style={{color:"#fff"}}>

<input
type="checkbox"
checked={closed}
onChange={e=>setClosed(e.target.checked)}
/>

Forçar loja fechada

</label>

<button
onClick={save}
style={ui.buttonPrimary}
disabled={saving}
>

Salvar

</button>

</div>

</section>
</main>
</>
)

}