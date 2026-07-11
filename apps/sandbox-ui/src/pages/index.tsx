import type { NextPage } from 'next'
import Head from 'next/head'
import ChatBox from '../components/ChatBox/ChatBox'

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Sandbox | microfyxd</title>
        <meta name="description" content="Sandbox chat interface" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
        <h1>Sandbox</h1>
        <ChatBox />
      </main>
    </>
  )
}

export default Home
