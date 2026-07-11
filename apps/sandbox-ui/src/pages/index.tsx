import type { NextPage } from 'next'
import Head from 'next/head'
import ChatBox from '../components/ChatBox/ChatBox'

const Home: NextPage = () => (
  <>
    <Head>
      <title>CodeForge | microfyxd sandbox</title>
      <meta name="description" content="AI code generation for microfyxd-site" />
    </Head>
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#080808',
      padding: '1rem',
    }}>
      <ChatBox />
    </main>
  </>
)

export default Home
