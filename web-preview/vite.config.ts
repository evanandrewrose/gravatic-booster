import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import http from 'http';
import { LocalWindowsClientProvider } from 'scr-api-node-providers';

// The SC:R API runs with CORS enabled. To be able to talk to it from the web-preview,
// we need to run a proxy server that overwrites the CORS headers to allow any origin.
class AllowCorsServerPlugin {
	private server: http.Server | null = null;

	name = 'cors-server-plugin';

	buildStart = async () => {
		const uri = new URL((await new LocalWindowsClientProvider().provide()));

		this.server = http.createServer((req, res) => {
				req.pipe(
					http.request(
						{
							hostname: uri.hostname,
							port: uri.port,
							path: req.url,
							method: req.method,
							headers: req.headers
						}),
						{ end: true }
					)
				 .on('response', (response) => {
					res.setHeader('Access-Control-Allow-Origin', '*');
					res.writeHead(response.statusCode ?? 200, response.headers);
					response.pipe(res);
				})
			})
			.listen(57421);
	}

	buildEnd = () => {
		this.server?.close();
	}
}

export default defineConfig({
	plugins: [sveltekit(), new AllowCorsServerPlugin()]
});
