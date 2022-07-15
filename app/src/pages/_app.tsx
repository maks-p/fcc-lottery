import '../styles/globals.css';
import { ThemeProvider } from '@emotion/react';
import styled from '@emotion/styled';
import { theme } from '../styles/theme';
import type { AppProps } from 'next/app';

function App({ Component, pageProps }: AppProps) {
	console.log(theme);
	return (
		<ThemeProvider theme={{ theme }}>
			<Component {...pageProps} />
		</ThemeProvider>
	);
}

export default App;
