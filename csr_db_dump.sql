--
-- PostgreSQL database dump
--

\restrict Ab3KUiOWBrWYbzAwXPouPjEXi4RGKLY7xGH8tXwub8iM3WZlvIb5WudhfpVylEi

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_jobs (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    requested_by integer NOT NULL,
    hours integer NOT NULL,
    status character varying(25) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    completed_at timestamp with time zone,
    summary_json text NOT NULL,
    pdf_bytes bytea,
    error character varying(400) NOT NULL,
    range_start timestamp with time zone,
    range_end timestamp with time zone,
    period_label character varying(60) DEFAULT ''::character varying
);


--
-- Name: audit_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_jobs_id_seq OWNED BY public.audit_jobs.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    external_key character varying(64) NOT NULL,
    title character varying(200) NOT NULL,
    contact_number character varying(60) NOT NULL,
    state character varying(30) NOT NULL,
    needs_review boolean NOT NULL,
    review_reason character varying(300) NOT NULL,
    last_seen_at timestamp with time zone NOT NULL,
    first_seen_at timestamp with time zone NOT NULL,
    display_name_override character varying(200),
    contact_number_override character varying(60)
);


--
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    fingerprint character varying(64) NOT NULL,
    sender character varying(160) NOT NULL,
    from_me boolean NOT NULL,
    text text NOT NULL,
    media character varying(90) NOT NULL,
    media_duration character varying(60) NOT NULL,
    "timestamp" character varying(110) NOT NULL,
    received_at timestamp with time zone NOT NULL,
    occurred_at timestamp with time zone,
    time_quality character varying(20) DEFAULT 'unknown'::character varying,
    source_message_id character varying(200) DEFAULT ''::character varying
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: security_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_events (
    id integer NOT NULL,
    actor_id integer,
    action character varying(80) NOT NULL,
    subject_id integer,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: security_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.security_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: security_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.security_events_id_seq OWNED BY public.security_events.id;


--
-- Name: sync_checkpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_checkpoints (
    employee_id integer NOT NULL,
    last_completed_at timestamp with time zone,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: sync_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_logs (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    conversations_seen integer NOT NULL,
    new_messages integer NOT NULL,
    unread_excluded integer NOT NULL,
    review_count integer NOT NULL,
    window_hours integer NOT NULL,
    status character varying(30) NOT NULL
);


--
-- Name: sync_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sync_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sync_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sync_logs_id_seq OWNED BY public.sync_logs.id;


--
-- Name: sync_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_runs (
    id character varying(36) NOT NULL,
    employee_id integer NOT NULL,
    since_at timestamp with time zone NOT NULL,
    planned_until timestamp with time zone NOT NULL,
    status character varying(25) NOT NULL,
    initial boolean NOT NULL,
    batches_saved integer NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    full_name character varying(120) NOT NULL,
    email character varying(200) NOT NULL,
    employee_code character varying(50) NOT NULL,
    phone character varying(40) NOT NULL,
    whatsapp_number character varying(45) NOT NULL,
    department character varying(80) NOT NULL,
    designation character varying(80) NOT NULL,
    password_hash character varying(230) NOT NULL,
    role character varying(20) NOT NULL,
    approved boolean NOT NULL,
    active boolean NOT NULL,
    token_version integer NOT NULL,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: voice_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voice_assets (
    id integer NOT NULL,
    message_id integer NOT NULL,
    status character varying(20) NOT NULL,
    mime character varying(50) NOT NULL,
    byte_size integer NOT NULL,
    sha256 character varying(64) NOT NULL,
    storage_key character varying(100) NOT NULL,
    attempts integer NOT NULL,
    error character varying(220) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: voice_assets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.voice_assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: voice_assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.voice_assets_id_seq OWNED BY public.voice_assets.id;


--
-- Name: audit_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_jobs ALTER COLUMN id SET DEFAULT nextval('public.audit_jobs_id_seq'::regclass);


--
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: security_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events ALTER COLUMN id SET DEFAULT nextval('public.security_events_id_seq'::regclass);


--
-- Name: sync_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_logs ALTER COLUMN id SET DEFAULT nextval('public.sync_logs_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: voice_assets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_assets ALTER COLUMN id SET DEFAULT nextval('public.voice_assets_id_seq'::regclass);


--
-- Data for Name: audit_jobs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_jobs (id, employee_id, requested_by, hours, status, created_at, completed_at, summary_json, pdf_bytes, error, range_start, range_end, period_label) FROM stdin;
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.conversations (id, employee_id, external_key, title, contact_number, state, needs_review, review_reason, last_seen_at, first_seen_at, display_name_override, contact_number_override) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, conversation_id, fingerprint, sender, from_me, text, media, media_duration, "timestamp", received_at, occurred_at, time_quality, source_message_id) FROM stdin;
\.


--
-- Data for Name: security_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.security_events (id, actor_id, action, subject_id, created_at) FROM stdin;
1	1	login	1	2026-11-10 20:59:19.096384+05
2	1	logout	1	2026-11-10 21:01:40.645132+05
3	1	login	1	2026-11-10 21:03:16.636924+05
4	1	employee_status_changed	2	2026-11-10 21:03:31.786701+05
5	1	logout	1	2026-11-10 21:03:42.582199+05
9	1	login	1	2026-11-10 21:08:52.002102+05
10	1	logout	1	2026-11-10 21:10:36.243651+05
11	1	login	1	2026-11-10 21:11:19.754502+05
12	1	employee_status_changed	3	2026-11-10 21:11:27.781437+05
13	1	logout	1	2026-11-10 21:11:29.949598+05
16	1	login	1	2026-11-10 21:13:28.408647+05
17	1	audit_requested	2	2026-11-10 21:14:22.697951+05
18	1	audit_requested	2	2026-11-10 21:14:22.912788+05
19	1	logout	1	2026-11-10 21:21:58.247608+05
29	1	login	1	2026-11-10 22:01:13.024334+05
30	1	logout	1	2026-11-10 22:02:28.753612+05
33	1	login	1	2026-11-10 22:03:56.114815+05
34	1	employee_status_changed	4	2026-11-10 22:04:15.575454+05
35	1	login	1	2026-11-10 22:13:17.636519+05
36	1	login	1	2026-11-10 22:13:52.82024+05
37	1	login	1	2026-11-10 22:18:03.961961+05
40	1	login	1	2026-11-11 19:45:42.380496+05
41	1	login	1	2026-11-12 18:52:15.404042+05
42	1	logout	1	2026-11-12 19:05:56.211344+05
45	1	login	1	2026-11-12 20:21:20.202157+05
46	1	login	1	2026-11-12 20:35:41.542229+05
53	1	login	1	2026-11-13 18:42:45.231258+05
55	1	login	1	2026-11-13 21:23:42.390538+05
59	1	login	1	2026-11-16 23:53:05.038471+05
60	1	login	1	2026-11-16 23:53:06.260458+05
63	1	login	1	2026-11-17 00:11:46.184725+05
64	1	login	1	2026-11-17 00:11:47.201419+05
66	1	login	1	2026-11-17 00:31:14.826179+05
67	1	login	1	2026-11-17 00:31:16.100504+05
72	1	login	1	2026-11-17 16:45:54.302749+05
73	1	login	1	2026-11-17 18:45:43.139514+05
74	1	audit_requested	2	2026-11-17 18:45:57.840614+05
75	1	audit_requested	3	2026-11-17 18:46:24.685239+05
76	1	audit_requested	2	2026-11-17 19:08:35.222025+05
77	1	audit_requested	3	2026-11-17 19:22:36.279923+05
78	1	audit_requested	3	2026-11-17 20:58:01.66379+05
79	1	audit_requested	3	2026-11-17 21:26:35.315508+05
80	1	login	1	2026-11-17 21:41:11.361212+05
81	1	audit_requested	2	2026-11-17 21:41:24.544143+05
82	1	audit_requested	3	2026-11-17 21:42:36.69666+05
83	1	audit_requested	3	2026-11-17 21:45:00.940006+05
84	1	employee_status_changed	5	2026-11-17 21:52:26.500983+05
86	1	audit_requested	3	2026-11-17 21:55:57.758171+05
87	1	audit_requested	2	2026-11-17 22:03:47.894233+05
88	1	audit_requested	3	2026-11-17 22:07:27.820464+05
89	1	employee_status_changed	6	2026-11-17 22:39:03.160772+05
92	1	login	1	2026-11-18 13:10:18.077648+05
93	1	login	1	2026-11-18 13:10:19.233395+05
94	1	login	1	2026-11-18 15:55:50.388049+05
95	1	login	1	2026-11-18 15:55:51.489737+05
96	1	audit_requested	5	2026-11-18 15:58:05.946527+05
97	1	audit_requested	5	2026-11-18 16:01:32.472931+05
98	1	login	1	2026-11-18 16:03:16.425694+05
99	1	audit_requested	5	2026-11-18 17:00:48.999155+05
100	1	login	1	2026-11-18 17:26:44.989101+05
101	1	audit_requested	5	2026-11-18 17:30:47.083639+05
102	1	audit_requested	5	2026-11-18 17:45:58.655889+05
103	1	audit_requested	5	2026-11-18 17:50:30.866778+05
104	1	login	1	2026-11-18 18:01:14.768223+05
\.


--
-- Data for Name: sync_checkpoints; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sync_checkpoints (employee_id, last_completed_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sync_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sync_logs (id, employee_id, created_at, conversations_seen, new_messages, unread_excluded, review_count, window_hours, status) FROM stdin;
\.


--
-- Data for Name: sync_runs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sync_runs (id, employee_id, since_at, planned_until, status, initial, batches_saved, completed_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, full_name, email, employee_code, phone, whatsapp_number, department, designation, password_hash, role, approved, active, token_version, created_at) FROM stdin;
1	Local Super Admin	admin@gmail.com	LOCAL-ADMIN		+00000000001	Administration	Administrator	pbkdf2_sha256$600000$19f54a5875d4b22ac96ed06f3f8c0b95$333c670584285509ada18816d6c7cc9e6f9f3d4a3c1c03bf3a86bcfd23e26791	admin	t	t	8	2026-11-10 20:50:46.377826+05
\.


--
-- Data for Name: voice_assets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.voice_assets (id, message_id, status, mime, byte_size, sha256, storage_key, attempts, error, created_at, updated_at) FROM stdin;
\.


--
-- Name: audit_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_jobs_id_seq', 18, true);


--
-- Name: conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.conversations_id_seq', 928, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 9641, true);


--
-- Name: security_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.security_events_id_seq', 104, true);


--
-- Name: sync_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sync_logs_id_seq', 78, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- Name: voice_assets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.voice_assets_id_seq', 1709, true);


--
-- Name: audit_jobs audit_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_jobs
    ADD CONSTRAINT audit_jobs_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: sync_checkpoints sync_checkpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_checkpoints
    ADD CONSTRAINT sync_checkpoints_pkey PRIMARY KEY (employee_id);


--
-- Name: sync_logs sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_pkey PRIMARY KEY (id);


--
-- Name: sync_runs sync_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_runs
    ADD CONSTRAINT sync_runs_pkey PRIMARY KEY (id);


--
-- Name: conversations uq_conversation_employee_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT uq_conversation_employee_key UNIQUE (employee_id, external_key);


--
-- Name: messages uq_message_fingerprint; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT uq_message_fingerprint UNIQUE (conversation_id, fingerprint);


--
-- Name: users users_employee_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_employee_code_key UNIQUE (employee_code);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_whatsapp_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_whatsapp_number_key UNIQUE (whatsapp_number);


--
-- Name: voice_assets voice_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_assets
    ADD CONSTRAINT voice_assets_pkey PRIMARY KEY (id);


--
-- Name: ix_audit_jobs_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_jobs_employee_id ON public.audit_jobs USING btree (employee_id);


--
-- Name: ix_audit_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_jobs_status ON public.audit_jobs USING btree (status);


--
-- Name: ix_conversations_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_conversations_employee_id ON public.conversations USING btree (employee_id);


--
-- Name: ix_conversations_last_seen_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_conversations_last_seen_at ON public.conversations USING btree (last_seen_at);


--
-- Name: ix_message_occurred_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_message_occurred_at ON public.messages USING btree (occurred_at);


--
-- Name: ix_message_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_message_time ON public.messages USING btree ("timestamp");


--
-- Name: ix_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_messages_conversation_id ON public.messages USING btree (conversation_id);


--
-- Name: ix_sync_logs_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sync_logs_employee_id ON public.sync_logs USING btree (employee_id);


--
-- Name: ix_sync_runs_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sync_runs_employee_id ON public.sync_runs USING btree (employee_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_voice_assets_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_voice_assets_message_id ON public.voice_assets USING btree (message_id);


--
-- Name: ix_voice_assets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_voice_assets_status ON public.voice_assets USING btree (status);


--
-- Name: audit_jobs audit_jobs_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_jobs
    ADD CONSTRAINT audit_jobs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id);


--
-- Name: audit_jobs audit_jobs_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_jobs
    ADD CONSTRAINT audit_jobs_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: conversations conversations_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id);


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);


--
-- Name: security_events security_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: sync_checkpoints sync_checkpoints_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_checkpoints
    ADD CONSTRAINT sync_checkpoints_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id);


--
-- Name: sync_logs sync_logs_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id);


--
-- Name: sync_runs sync_runs_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_runs
    ADD CONSTRAINT sync_runs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id);


--
-- Name: voice_assets voice_assets_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_assets
    ADD CONSTRAINT voice_assets_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Ab3KUiOWBrWYbzAwXPouPjEXi4RGKLY7xGH8tXwub8iM3WZlvIb5WudhfpVylEi

