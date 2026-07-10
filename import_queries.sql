-- =============================================
-- 1. CREATE TABLES FOR 'todo' & 'todos_history'
-- =============================================

CREATE TABLE IF NOT EXISTS todo (
  id INT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  details TEXT,
  priority VARCHAR(50) DEFAULT 'low',
  status VARCHAR(50) DEFAULT 'pending',
  remarks TEXT,
  created_by INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by INT,
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS todos_history (
  id INT PRIMARY KEY,
  todo_id INT REFERENCES todo(id) ON DELETE CASCADE,
  modified_by INT,
  modified_by_name VARCHAR(255),
  modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  changes TEXT
);

-- =============================================
-- 2. INSERTS FOR 'todo' TABLE
-- =============================================

INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (1, 'H.D. Firecon Techno Pvt. Ltd. AMC invoice', '(FROM 01 MAY 2026 TO 30 OCTOBER 2026)
Second Installment', 'low', 'finished', 112, '2026-06-23 04:57:37.282437+00', 112, '2026-06-23 04:59:01.210671+00');
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (2, 'tally final 25-26 PATS', 'saket+ asmita madam finalization karne
1-acess pt1856827 evde ka aahet, (Yogesh Sir)
2-indirect exp adjustmentla 41/11tar 25-26 la 42.03 disat aahet kami ka distat
3-current liabilities-25.26 la 37.33 - 38.78 kami ka zale/
4-mF investment fixed asset kase dakhwat yeiel
5-25-26 cash in hand 104492 disat aahe
6-25-26 advance tax paid 20k opening bal dakhwal aahe/

25-26
a-purchase-36.99-36.80 kami ka zala
b-gross 33.72 n 47.30 before adjustment aahe evada kami kasa kay zala
c-derreref d tax 182212 aahe to 0 kasa karta yeiel
d- stock -2l in servise settle karne
e-acess pt stock621109 kami karawa lagel
f- 24-1-26-45000 kotak, SIP entry', 'low', 'pending', 108, '2026-07-08 10:56:30.001275+00', 112, '2026-07-09 05:35:37.110188+00');
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (3, 'Revati Madam (ITR & TCS Certificate)', 'Revati ITR 25-26 paying kindly consider TCS certificate received from kesari tours', 'low', 'pending', 112, '2026-07-06 07:47:36.236685+00', NULL, NULL);
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (4, 'Pinnac -Domain & Backup Software & Cloud Backup', 'Proforma Inv Sign Copy -Done (Final Inv Copy Pending)
1. Pinnac Consulting -R-043 (AMT-106037) (Domain)
2. Pinnac Consulting -R-044 (AMT-105633) (Backup Software)
3. Pinnac Consulting -R-045 (AMT-103840) (Cloud Backup)
saket sir bole GST paid nahi karyacha mi tally madhe sagle inv 31.3.27 la transfer kele ahet', 'low', 'pending', 112, '2026-07-01 06:43:54.714834+00', 112, '2026-07-08 09:51:04.583063+00');
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (5, 'Pinnac Cons-(QHEPS)Print Pending', 'Proforma Invoice-22- (dt 17.06.2026)
Inv checking karne pending and print pending
QHEPS - 50 user
', 'low', 'pending', 112, '2026-06-22 09:53:15.58601+00', 112, '2026-07-01 06:45:09.142688+00');
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (6, 'Printer points utkarsha (Saket Sir W.P MSG)', 'Patch pannel -2 cat 6a,Patch cord, Rack, Switch 2,Acess pnt 8, Firewall', 'low', 'pending', 112, '2026-06-23 05:01:56.349896+00', NULL, NULL);
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (7, 'payment to be done', 'june 26

lic netra-12k
shilpa lic pre-41814
skoda-16k
skt/revti emi-52+58K


JULY
SKT LIC PRE-36515', 'low', 'pending', 108, '2026-06-23 07:56:07.154168+00', 108, '2026-06-23 08:19:15.194763+00');
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (8, 'SUSHRUT lic NOMINEE REMAINDER', 'NOMINEE UPDATE', 'low', 'pending', 108, '2026-06-23 08:19:41.309894+00', NULL, NULL);
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (9, 'Tally back  ITR-25-26 & Statement', 'Mutual fund statement
Fd interest statement
All Bank & loan statement
Period - 01 April 2025 to 31 March 2026', 'low', 'pending', 112, '2026-06-22 09:40:23.981438+00', 112, '2026-06-22 11:18:59.172139+00');
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (10, 'Dhiraj Langote  ', 'Purchase Invoice Pending -
June follow up Date -11,13,18,30', 'low', 'pending', 112, '2026-06-30 07:13:09.737917+00', NULL, NULL);
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (11, 'Nilesh', 'Call Nilesh Sir ani material return che update ghya', 'low', 'deleted', 110, '2026-06-19 12:02:00.771598+00', 110, '2026-06-22 08:49:41.645273+00');
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (12, 'gayatri madam PC+ UPS', 'shrikant sir managing this work', 'low', 'pending', 108, '2026-07-08 10:34:49.161392+00', NULL, NULL);
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (13, 'Pinnac/DCad/Maithalee - PRO G CAD', 'All pinnac invoices prog cad value 20k ne kele print pending
1. Pinnac Cons-R-046 (AMT-1199812)
2. DCAD -R-047 (AMT-23600)
3. Maithilee - R-048 (AMT-141600)
saket sir bole GST paid nahi karyacha mi tally madhe sagle inv 31.3.27 la transfer kele ahet
', 'low', 'pending', 112, '2026-06-22 08:26:26.375147+00', 112, '2026-07-04 07:20:40.223189+00');
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (14, 'AVK GREEN -Sign Pending', 'Inv No-26-27/PATS/S-015
Date :- 22.04.2026
', 'low', 'finished', 112, '2026-06-22 10:05:09.82655+00', 112, '2026-06-22 11:04:31.944137+00');
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (15, 'MF investment ', 'MF चे investment fixed asset or Kontya asset la टाकू शकतो', 'low', 'pending', 112, '2026-06-22 09:44:16.500182+00', 112, '2026-06-22 09:46:30.322319+00');
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (16, 'MCES-10 Users', 'mcecostudio email bill
google work place- std
Sirani: 25-26 pramane final bill ready. Check/Print pending. 
mcecostudio email bill 3-7-26 to 2-7-27 10 users , 10368/user print pending', 'low', 'pending', 112, '2026-07-06 08:11:49.608164+00', 112, '2026-07-08 09:50:29.724345+00');
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (17, 'Chiranjiv', 'CAll chiranjiv ani cheques deliver karayla sanga', 'low', 'deleted', 110, '2026-06-19 12:01:03.896468+00', 110, '2026-06-22 08:49:45.368856+00');
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (18, 'Gayatri madam - Monitor Details ', '. Gayatri madam 2 mntr 27inch-kiti monitor dile', 'low', 'pending', 108, '2026-06-19 11:52:31.479522+00', 112, '2026-06-22 10:06:37.653245+00');
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (19, 'Pats-Pan Card', 'address change', 'low', 'pending', 112, '2026-06-22 11:12:34.760108+00', NULL, NULL);
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (20, 'Pinnac-final closing balance for 31.03.2026 and till date			', 'Mail Send final closing balance dt 08.07.26  ', 'low', 'pending', 112, '2026-07-08 09:44:53.620402+00', NULL, NULL);
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (21, 'AVK GREEN-Sign Pending', 'Inv No-25-26/PATS/R-186/
Inv Date :- 31.3.2026
Pro G CAD', 'low', 'pending', 112, '2026-06-22 09:58:58.316182+00', 112, '2026-06-22 10:01:39.085765+00');
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (22, 'AC purchase add in task', 'saket sirani w.p msg', 'low', 'pending', 112, '2026-07-08 09:46:13.472357+00', NULL, NULL);
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (23, 'BOB BANK ', 'Payment -Follow-up
Two Invoice Amt: -12000
Ankush Sir Final approval Amt :- 9800
Payment che updated dhile ahe sir ankush siranshi  call zhala 
payment done
Banket javun aali madam aaj payment karnar ahet

Sirana call sathi reminder kele 29.06.26 
ki te sangnar ahet 
Bob Suman madam tyanchi copy dhili pn pymt che tyana final sgyche ahe 
Suman madam payment  transfer aaj kiva udya karnar ahet ', 'low', 'finished', 112, '2026-06-22 11:11:27.493984+00', 112, '2026-07-08 08:48:15.835149+00');
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (24, 'Pinnac all AMC -4th Inst-Not confirmed ', '1. Pinnac Cons-Proforma Invoice-14 (35400)
2. Pinnac HSG-Proforma Invoice-15 (17700)
3.  Maithilee-Proforma Invoice-16 (Amt- 17700)
4. DCAD- Proforma Invoice-17 (Amt- 8850)
5. DCA-Proforma Invoice-18 (Amt -17700)
6. EnvoNest (company name che vichrane pending)
   Proforma Invoice-19 (Amt- 8850)

 Saket  Sir na vicharne- bifurcate as per company
pinnac AMc bill fro JAn 26 to march 26- 40000/mobth
apr 26 to june 26-40000/month
', 'low', 'pending', 112, '2026-07-01 06:59:46.329598+00', 112, '2026-07-08 11:06:10.542901+00');
INSERT INTO todo (id, title, details, priority, status, created_by, created_at, updated_by, updated_at) VALUES (25, 'dhiraj opus GST bill', 'GST bill', 'low', 'deleted', 108, '2026-06-22 07:51:32.966768+00', 108, '2026-06-22 11:35:08.185841+00');

-- =============================================
-- 3. INSERTS FOR 'todos_history' TABLE
-- =============================================

INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (1, 10, 112, '2026-06-30 07:13:10.027811+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (2, 24, 112, '2026-07-08 11:06:10.826932+00', '["Details updated from "1. Pinnac Cons-Proforma Invoice-14 (35400)
2. Pinnac HSG-Proforma Invoice-15 (17700)
3.  Maithilee-Proforma Invoice-16 (Amt- 17700)
4. DCAD- Proforma Invoice-17 (Amt- 8850)
5. DCA-Proforma Invoice-18 (Amt -17700)
6. EnvoNest (company name che vichrane pending)
   Proforma Invoice-19 (Amt- 8850)" to "1. Pinnac Cons-Proforma Invoice-14 (35400)
2. Pinnac HSG-Proforma Invoice-15 (17700)
3.  Maithilee-Proforma Invoice-16 (Amt- 17700)
4. DCAD- Proforma Invoice-17 (Amt- 8850)
5. DCA-Proforma Invoice-18 (Amt -17700)
6. EnvoNest (company name che vichrane pending)
   Proforma Invoice-19 (Amt- 8850)

 Saket  Sir na vicharne- bifurcate as per company
pinnac AMc bill fro JAn 26 to march 26- 40000/mobth
apr 26 to june 26-40000/month
""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (3, 23, 112, '2026-06-29 11:42:57.882524+00', '["Details updated from "Payment -Follow-up
Two Invoice Amt: -12000
Ankush Sir Final approval Amt :- 9800
Payment che updated dhile ahe sir ankush siranshi  call zhala 
ki te sangnar ahet 
Bob Suman madam tyanchi copy dhili pn pymt che tyana final sgyche ahe " to "Payment -Follow-up
Two Invoice Amt: -12000
Ankush Sir Final approval Amt :- 9800
Payment che updated dhile ahe sir ankush siranshi  call zhala 
Sirana call sathi reminder kele 29.06.26 
ki te sangnar ahet 
Bob Suman madam tyanchi copy dhili pn pymt che tyana final sgyche ahe ""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (4, 23, 112, '2026-06-22 11:11:27.754468+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (5, 3, 112, '2026-07-06 07:47:36.457102+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (6, 24, 112, '2026-07-01 06:59:46.563732+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (7, 23, 112, '2026-06-24 09:46:13.269928+00', '["Details updated from "Payment -Follow-up
Two Invoice Amt: -12000
Ankush Sir Final approval Amt :- 9800
updated dhile ahe sirancha call zhala ki te sangnar ahet " to "Payment -Follow-up
Two Invoice Amt: -12000
Ankush Sir Final approval Amt :- 9800
Payment che updated dhile ahe sir ankush siranshi  call zhala ki te sangnar ahet ""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (8, 23, 112, '2026-07-02 06:36:44.945587+00', '["Details updated from "Payment -Follow-up
Two Invoice Amt: -12000
Ankush Sir Final approval Amt :- 9800
Payment che updated dhile ahe sir ankush siranshi  call zhala 
Sirana call sathi reminder kele 29.06.26 
ki te sangnar ahet 
Bob Suman madam tyanchi copy dhili pn pymt che tyana final sgyche ahe " to "Payment -Follow-up
Two Invoice Amt: -12000
Ankush Sir Final approval Amt :- 9800
Payment che updated dhile ahe sir ankush siranshi  call zhala 
Sirana call sathi reminder kele 29.06.26 
ki te sangnar ahet 
Bob Suman madam tyanchi copy dhili pn pymt che tyana final sgyche ahe 
Suman madam payment  transfer aaj kiva udya karnar ahet ""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (9, 16, 112, '2026-07-06 09:27:48.291787+00', '["Details updated from "mcecostudio email bill
google work place- stD" to "mcecostudio email bill
google work place- std
Sirani: 25-26 pramane final bill ready. Check/Print pending. Amt""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (10, 16, 112, '2026-07-08 08:49:57.236325+00', '["Details updated from "mcecostudio email bill
google work place- std
Sirani: 25-26 pramane final bill ready. Check/Print pending. Amt" to "mcecostudio email bill
google work place- std
Sirani: 25-26 pramane final bill ready. Check/Print pending. 
mcecostudio email bill 3-7-26 to 2-7-27 10 users , 10368/user print pending""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (11, 13, 112, '2026-06-22 08:26:26.60953+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (12, 1, 112, '2026-06-23 04:59:01.446439+00', '["Status changed from pending to finished"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (13, 23, 112, '2026-07-08 08:48:16.055593+00', '["Status changed from pending to finished"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (14, 13, 112, '2026-06-22 09:37:44.912111+00', '["Title updated from "saket sir " to "pinnac - prog cad invoice""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (15, 13, 112, '2026-06-22 08:30:57.187343+00', '["Details updated from "1. all pinnac invoices progcad value 20k ne kele print pending
2. Tally backup mail send 25-26 pending
3. Gayatri madam 2 mntr 27inch
4. MF चे investment fixed asset or Kontya asset la टाकू शकतो
" to "1. all pinnac invoices progcad value 20k ne kele print pending
2. Tally backup mail send 25-26 pending
3. Gayatri madam 2 mntr 27inch
4. MF चे investment fixed asset or Kontya asset la टाकू शकतो
5. Dhiraj opus GST bill
""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (16, 13, 108, '2026-06-22 08:51:27.925408+00', '["Details updated from "1. all pinnac invoices progcad value 20k ne kele print pending
2. Tally backup mail send 25-26 pending
3. Gayatri madam 2 mntr 27inch
4. MF चे investment fixed asset or Kontya asset la टाकू शकतो
5. Dhiraj opus GST bill
" to "1. all pinnac invoices progcad value 20k ne kele print pending
2. Tally backup mail send 25-26 pending
3. Gayatri madam 2 mntr 27inch-kiti monitor dile
4. MF चे investment fixed asset or Kontya asset la टाकू शकतो
5. Dhiraj opus GST bill
""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (17, 2, 108, '2026-07-08 11:08:17.428695+00', '["Details updated from "saket+ asmita madam finalization karne
" to "saket+ asmita madam finalization karne
1-acess pt1856827 evde ka aahet, 
2-indirect exp adjustmentla 41/11tar 25-26 la 42.03 disat aahet kami ka distat
3-current liabilities-25.26 la 37.33 - 38.78 kami ka zale/
4-mF investment fixed asset kase dakhwat yeiel
5-25-26 cash in hand 104492 disat aahe
6-25-26 advance tax paid 20k opening bal dakhwal aahe/

25-26
a-purchase-36.99-36.80 kami ka zala
b-gross 33.72 n 47.30 before adjustment aahe evada kami kasa kay zala
c-derreref d tax 182212 aahe to 0 kasa karta yeiel
d- stock -2l in servise settle karne
e-acess pt stock621109 kami karawa lagel
f- 24-1-26-45000 kotak, SIP entry""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (18, 16, 112, '2026-07-08 09:50:30.437478+00', '["Title updated from "MCES-10 USERS" to "MCES-10 Users""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (19, 8, 108, '2026-06-23 08:19:41.571627+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (20, 18, 112, '2026-06-22 09:41:22.604625+00', '["Title updated from "call yogesh sir" to "Gayatri madam "","Details updated from "yogesh sirana itr 25-26 tally backup dene" to ". Gayatri madam 2 mntr 27inch-kiti monitor dile""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (21, 13, 112, '2026-06-22 10:09:23.989806+00', '["Title updated from "Pinnac/DCad/Maithalee - prog cad " to "Pinnac/DCad/Maithalee - PRO G CAD""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (22, 9, 112, '2026-06-22 11:18:59.46947+00', '["Title updated from "Tally back -25-26" to "Tally back  ITR-25-26 & Statement"","Details updated from "Tally backup mail send 25-26 pending
" to "Mutual fund statement
Fd interest statement
All Bank & loan statement
Period - 01 April 2025 to 31 March 2026""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (23, 4, 112, '2026-07-08 09:51:04.873124+00', '["Title updated from "Pinnac -Domain Invoice & Backup Software & Cloud Backup" to "Pinnac -Domain & Backup Software & Cloud Backup""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (24, 22, 112, '2026-07-08 09:46:13.754471+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (25, 5, 112, '2026-07-01 06:45:09.362809+00', '["Details updated from "Proforma Invoice-22- (dt 17.06.2026)
Inv checking pending karne and print pending
QHEPS - 50 user
" to "Proforma Invoice-22- (dt 17.06.2026)
Inv checking karne pending and print pending
QHEPS - 50 user
""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (26, 2, 112, '2026-07-09 05:35:37.385394+00', '["Details updated from "saket+ asmita madam finalization karne
1-acess pt1856827 evde ka aahet, 
2-indirect exp adjustmentla 41/11tar 25-26 la 42.03 disat aahet kami ka distat
3-current liabilities-25.26 la 37.33 - 38.78 kami ka zale/
4-mF investment fixed asset kase dakhwat yeiel
5-25-26 cash in hand 104492 disat aahe
6-25-26 advance tax paid 20k opening bal dakhwal aahe/

25-26
a-purchase-36.99-36.80 kami ka zala
b-gross 33.72 n 47.30 before adjustment aahe evada kami kasa kay zala
c-derreref d tax 182212 aahe to 0 kasa karta yeiel
d- stock -2l in servise settle karne
e-acess pt stock621109 kami karawa lagel
f- 24-1-26-45000 kotak, SIP entry" to "saket+ asmita madam finalization karne
1-acess pt1856827 evde ka aahet, (Yogesh Sir)
2-indirect exp adjustmentla 41/11tar 25-26 la 42.03 disat aahet kami ka distat
3-current liabilities-25.26 la 37.33 - 38.78 kami ka zale/
4-mF investment fixed asset kase dakhwat yeiel
5-25-26 cash in hand 104492 disat aahe
6-25-26 advance tax paid 20k opening bal dakhwal aahe/

25-26
a-purchase-36.99-36.80 kami ka zala
b-gross 33.72 n 47.30 before adjustment aahe evada kami kasa kay zala
c-derreref d tax 182212 aahe to 0 kasa karta yeiel
d- stock -2l in servise settle karne
e-acess pt stock621109 kami karawa lagel
f- 24-1-26-45000 kotak, SIP entry""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (27, 4, 112, '2026-07-01 06:43:55.005681+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (28, 23, 112, '2026-07-08 08:47:51.835377+00', '["Details updated from "Payment -Follow-up
Two Invoice Amt: -12000
Ankush Sir Final approval Amt :- 9800
Payment che updated dhile ahe sir ankush siranshi  call zhala 
Banket javun aali madam aaj payment karnar ahet

Sirana call sathi reminder kele 29.06.26 
ki te sangnar ahet 
Bob Suman madam tyanchi copy dhili pn pymt che tyana final sgyche ahe 
Suman madam payment  transfer aaj kiva udya karnar ahet " to "Payment -Follow-up
Two Invoice Amt: -12000
Ankush Sir Final approval Amt :- 9800
Payment che updated dhile ahe sir ankush siranshi  call zhala 
payment done
Banket javun aali madam aaj payment karnar ahet

Sirana call sathi reminder kele 29.06.26 
ki te sangnar ahet 
Bob Suman madam tyanchi copy dhili pn pymt che tyana final sgyche ahe 
Suman madam payment  transfer aaj kiva udya karnar ahet ""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (29, 20, 112, '2026-07-08 09:44:54.334948+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (30, 2, 108, '2026-07-08 10:56:30.288827+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (31, 11, 110, '2026-06-22 08:49:41.883258+00', '["Status changed from pending to deleted"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (32, 16, 112, '2026-07-06 08:11:49.859061+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (33, 23, 112, '2026-06-24 09:44:58.141475+00', '["Details updated from "Payment -Follow-up
Two Invoice Amt: -12000
Ankush Sir Final approval Amt :- 9800" to "Payment -Follow-up
Two Invoice Amt: -12000
Ankush Sir Final approval Amt :- 9800
updated dhile ahe sirancha call zhala ki te sangnar ahet ""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (34, 25, 108, '2026-06-22 11:35:08.300998+00', '["Status changed from pending to deleted"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (35, 13, 112, '2026-06-22 10:09:04.958439+00', '["Title updated from "pinnac - prog cad amt confirmation pending" to "Pinnac/DCad/Maithalee - prog cad ""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (36, 15, 112, '2026-06-22 09:44:16.738935+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (37, 13, 112, '2026-07-04 07:20:40.463179+00', '["Details updated from "All pinnac invoices prog cad value 20k ne kele print pending
1. Pinnac Cons-R-046 (AMT-1199812)
2. DCAD -R-047 (AMT-23600)
3. Maithilee - R-048 (AMT-141600)

" to "All pinnac invoices prog cad value 20k ne kele print pending
1. Pinnac Cons-R-046 (AMT-1199812)
2. DCAD -R-047 (AMT-23600)
3. Maithilee - R-048 (AMT-141600)
saket sir bole GST paid nahi karyacha mi tally madhe sagle inv 31.3.27 la transfer kele ahet
""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (38, 14, 112, '2026-06-22 11:04:32.205119+00', '["Status changed from pending to finished"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (39, 24, 112, '2026-07-02 07:35:46.317156+00', '["Title updated from "Pinnac ALL AMC -4th Installment  -Not confirmed " to "Pinnac all AMC -4th Inst-Not confirmed ""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (40, 13, 112, '2026-06-22 09:36:58.678302+00', '["Details updated from "1. all pinnac invoices progcad value 20k ne kele print pending
2. Tally backup mail send 25-26 pending
3. Gayatri madam 2 mntr 27inch-kiti monitor dile
4. MF चे investment fixed asset or Kontya asset la टाकू शकतो
5. Dhiraj opus GST bill
" to "All pinnac invoices progcad value 20k ne kele print pending
""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (41, 9, 112, '2026-06-22 09:40:24.285665+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (42, 17, 110, '2026-06-22 08:49:45.575653+00', '["Status changed from pending to deleted"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (43, 1, 112, '2026-06-23 04:57:37.535316+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (44, 5, 112, '2026-06-22 10:07:45.721711+00', '["Title updated from "Pinnac Cons" to "Pinnac Cons-(QHEPS)Print Pending""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (45, 14, 112, '2026-06-22 10:05:10.116747+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (46, 5, 112, '2026-06-22 10:05:34.074138+00', '["Title updated from "Pinnac Cons" to "Pinnac Cons-Print Pending""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (47, 25, 108, '2026-06-22 07:51:33.226962+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (48, 5, 112, '2026-06-22 09:53:15.81794+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (49, 23, 112, '2026-06-24 06:46:34.425757+00', '["Details updated from "Payment -Follow-up" to "Payment -Follow-up
Two Invoice Amt: -12000
Ankush Sir Final approval Amt :- 9800""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (50, 16, 112, '2026-07-08 09:50:16.7022+00', '["Title updated from "Maithilee Chandratre Eco Studio-Bill" to "MCES-10 USERS""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (51, 18, 112, '2026-06-19 12:06:03.88467+00', '["Details updated from "ITR " to "yogesh sirana itr 25-26 tally backup dene""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (52, 17, 110, '2026-06-19 12:01:04.179325+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (53, 19, 112, '2026-06-22 11:12:35.026933+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (54, 21, 112, '2026-06-22 10:01:39.363715+00', '["Details updated from "Inv No-25-26/PATS/R-186
Inv Date :- 31.3.2026
Pro G CAD" to "Inv No-25-26/PATS/R-186/
Inv Date :- 31.3.2026
Pro G CAD""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (55, 13, 112, '2026-06-22 10:06:13.168496+00', '["Title updated from "pinnac - prog cad invoice" to "pinnac - prog cad amt confirmation pending""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (56, 13, 112, '2026-07-01 06:31:36.766047+00', '["Details updated from "All pinnac invoices progcad value 20k ne kele print pending
" to "All pinnac invoices prog cad value 20k ne kele print pending
1. Pinnac Cons-R-046 (AMT-1199812)
2. DCAD -R-047 (AMT-23600)
3. Maithilee - R-048 (AMT-141600)

""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (57, 21, 112, '2026-06-22 10:01:39.085765+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (58, 4, 112, '2026-07-04 07:23:20.422898+00', '["Details updated from "Proforma Inv Sign Copy -Done (Final Inv Copy Pending)
1. Pinnac Consulting -R-043 (AMT-106037) (Domain)
2. Pinnac Consulting -R-044 (AMT-105633) (Backup Software)
3. Pinnac Consulting -R-045 (AMT-103840) (Cloud Backup)" to "Proforma Inv Sign Copy -Done (Final Inv Copy Pending)
1. Pinnac Consulting -R-043 (AMT-106037) (Domain)
2. Pinnac Consulting -R-044 (AMT-105633) (Backup Software)
3. Pinnac Consulting -R-045 (AMT-103840) (Cloud Backup)
saket sir bole GST paid nahi karyacha mi tally madhe sagle inv 31.3.27 la transfer kele ahet""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (59, 12, 108, '2026-07-08 10:34:49.434266+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (60, 18, 108, '2026-06-19 11:52:31.738435+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (61, 11, 110, '2026-06-19 12:02:01.041426+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (62, 6, 112, '2026-06-23 05:01:56.569163+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (63, 18, 112, '2026-06-22 10:06:37.900736+00', '["Title updated from "Gayatri madam " to "Gayatri madam - Monitor Details ""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (64, 23, 112, '2026-07-04 04:46:44.161157+00', '["Details updated from "Payment -Follow-up
Two Invoice Amt: -12000
Ankush Sir Final approval Amt :- 9800
Payment che updated dhile ahe sir ankush siranshi  call zhala 
Banket javun aali madam aaj payment karnar ahet

Sirana call sathi reminder kele 29.06.26 
ki te sangnar ahet 
Bob Suman madam tyanchi copy dhili pn pymt che tyana final sgyche ahe 
Suman madam payment  transfer aaj kiva udya karnar ahet " to "Payment -Follow-up
Two Invoice Amt: -12000
Ankush Sir Final approval Amt :- 9800
Payment che updated dhile ahe sir ankush siranshi  call zhala 
payment done
Banket javun aali madam aaj payment karnar ahet

Sirana call sathi reminder kele 29.06.26 
ki te sangnar ahet 
Bob Suman madam tyanchi copy dhili pn pymt che tyana final sgyche ahe 
Suman madam payment  transfer aaj kiva udya karnar ahet ""]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (65, 7, 108, '2026-06-23 07:56:07.91127+00', '["Task created"]');
INSERT INTO todos_history (id, todo_id, modified_by, modified_at, changes) VALUES (66, 23, 112, '2026-06-24 11:51:00.338653+00', '["Details updated from "Payment -Follow-up
Two Invoice Amt: -12000
Ankush Sir Final approval Amt :- 9800
Payment che updated dhile ahe sir ankush siranshi  call zhala ki te sangnar ahet " to "Payment -Follow-up
Two Invoice Amt: -12000
Ankush Sir Final approval Amt :- 9800
Payment che updated dhile ahe sir ankush siranshi  call zhala 
ki te sangnar ahet 
Bob Suman madam tyanchi copy dhili pn pymt che tyana final sgyche ahe ""]');
