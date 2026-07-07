-- Advisory content seed (FR-30..34): role × event × language (en/sw).
-- Idempotent via ON CONFLICT.

INSERT INTO advisory_content (role_type, event_type, language, message_text) VALUES
-- ── FARMER ────────────────────────────────────────────────────────────
('farmer','rain','en','Rain expected soon. Hold off on planting and cover any drying produce.'),
('farmer','rain','sw','Mvua inatarajiwa hivi karibuni. Ahirisha kupanda na funika mazao yanayokaushwa.'),
('farmer','storm','en','Storm approaching. Secure greenhouses, livestock and stored harvest.'),
('farmer','storm','sw','Dhoruba inakaribia. Linda greenhouse, mifugo na mavuno yaliyohifadhiwa.'),
('farmer','flash_flood','en','Flash flood risk. Move livestock to high ground and clear drainage channels.'),
('farmer','flash_flood','sw','Hatari ya mafuriko ya ghafla. Hamisha mifugo sehemu za juu na safisha mifereji.'),
('farmer','high_wind','en','Strong winds expected. Stake young crops and shelter poultry.'),
('farmer','high_wind','sw','Upepo mkali unatarajiwa. Imarisha mimea michanga na kinga kuku.'),
('farmer','heat','en','High heat advisory. Irrigate early morning or evening and shade seedlings.'),
('farmer','heat','sw','Tahadhari ya joto kali. Nyunyizia maji asubuhi au jioni na weka kivuli kwa miche.'),
('farmer','fog','en','Dense fog likely. Delay spraying until visibility improves.'),
('farmer','fog','sw','Ukungu mzito unatarajiwa. Ahirisha kunyunyizia dawa hadi mwonekano uimarike.'),

-- ── BUSINESS / TRANSPORT ─────────────────────────────────────────────
('business','rain','en','Rain incoming. Allow extra time for deliveries; roads may be slow.'),
('business','rain','sw','Mvua inakuja. Ongeza muda wa usafirishaji; barabara zaweza kuwa polepole.'),
('business','storm','en','Storm warning. Consider rescheduling outdoor events and high-risk transport.'),
('business','storm','sw','Onyo la dhoruba. Fikiria kuahirisha matukio ya nje na usafiri wa hatari.'),
('business','flash_flood','en','Flash flood advisory. Avoid low-lying routes and underpasses.'),
('business','flash_flood','sw','Tahadhari ya mafuriko. Epuka barabara za chini na vichuguu.'),
('business','high_wind','en','High winds. Secure signage, scaffolding and light cargo.'),
('business','high_wind','sw','Upepo mkali. Imarisha mabango, vyuma vya ujenzi na mizigo myepesi.'),
('business','heat','en','Heat advisory. Schedule strenuous outdoor work for cooler hours.'),
('business','heat','sw','Tahadhari ya joto. Panga kazi nzito za nje kwa saa za baridi.'),
('business','fog','en','Fog warning. Reduce fleet speed and switch on hazard lights.'),
('business','fog','sw','Onyo la ukungu. Punguza mwendo wa magari na washa taa za tahadhari.'),

-- ── PILOT / OUTDOOR PROFESSIONAL ─────────────────────────────────────
('pilot','rain','en','Precipitation expected. Review approach minimums and runway braking action.'),
('pilot','rain','sw','Mvua inatarajiwa. Kagua viwango vya kutua na hali ya kusimama kwenye njia.'),
('pilot','storm','en','Convective storm developing. Expect wind shear and turbulence; reassess route.'),
('pilot','storm','sw','Dhoruba inajitokeza. Tarajia wind shear na mtikisiko; kagua njia upya.'),
('pilot','flash_flood','en','Heavy rain cells. Anticipate reduced visibility and ceiling drops.'),
('pilot','flash_flood','sw','Mvua nzito. Tarajia mwonekano hafifu na kushuka kwa dari ya mawingu.'),
('pilot','high_wind','en','High winds aloft. Check crosswind limits and gust spreads before departure.'),
('pilot','high_wind','sw','Upepo mkali angani. Kagua mipaka ya crosswind kabla ya kuondoka.'),
('pilot','heat','en','High density altitude. Expect degraded climb performance; recalculate takeoff data.'),
('pilot','heat','sw','Density altitude juu. Tarajia upungufu wa kupanda; hesabu upya data ya kuondoka.'),
('pilot','fog','en','Low visibility / fog. Verify IFR alternates and approach lighting status.'),
('pilot','fog','sw','Mwonekano hafifu / ukungu. Thibitisha njia mbadala za IFR na taa za kutua.'),

-- ── GENERAL PUBLIC ───────────────────────────────────────────────────
('general','rain','en','Rain expected. Carry an umbrella and plan your commute accordingly.'),
('general','rain','sw','Mvua inatarajiwa. Beba mwavuli na panga safari yako ipasavyo.'),
('general','storm','en','Storm approaching. Stay indoors and unplug sensitive electronics.'),
('general','storm','sw','Dhoruba inakaribia. Baki ndani na zima vifaa nyeti vya umeme.'),
('general','flash_flood','en','Flash flood advisory. Avoid flooded roads — do not drive through water.'),
('general','flash_flood','sw','Tahadhari ya mafuriko. Epuka barabara zenye maji — usiendeshe majini.'),
('general','high_wind','en','Strong winds expected. Secure loose outdoor items.'),
('general','high_wind','sw','Upepo mkali unatarajiwa. Imarisha vitu vilivyo nje.'),
('general','heat','en','Heat advisory. Stay hydrated and limit midday sun exposure.'),
('general','heat','sw','Tahadhari ya joto. Kunywa maji ya kutosha na epuka jua la mchana.'),
('general','fog','en','Fog warning. Drive slowly and keep a safe following distance.'),
('general','fog','sw','Onyo la ukungu. Endesha pole pole na uweke umbali salama.')
ON CONFLICT (role_type, event_type, language) DO UPDATE
  SET message_text = EXCLUDED.message_text, active = TRUE;
