import { supabase } from "./supabaseClient"

export async function isStoreOpen(){

const {data}=await supabase
.from("store_settings")
.select("*")
.single()

if(!data) return true

if(data.force_closed) return false

const now=new Date()

const current=now.getHours()*60+now.getMinutes()

const [oh,om]=data.open_time.split(":").map(Number)
const [ch,cm]=data.close_time.split(":").map(Number)

const open=oh*60+om
const close=ch*60+cm

return current>=open && current<=close

}