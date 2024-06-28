<script lang="ts">
	import { GravaticBooster, SCApiWithCaching } from 'gravatic-booster';
	import { SCApi, BroodWarConnection } from 'bw-web-api';

    let currentSeason = $state(-1);

    (async () => {
        const booster = await GravaticBooster.create(
            new SCApiWithCaching(new SCApi(new BroodWarConnection('http://localhost:57421')))
        );
        currentSeason = await booster.currentSeason()
    })()
</script>

Current season: {currentSeason}