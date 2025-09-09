#!/usr/bin/env node

const {
	BITBUCKET_REPO_SLUG,
	BITBUCKET_WORKSPACE,
	PR_BOT_TOKEN,
	PR_BOT_SOURCE_BRANCH = "main",
	PR_BOT_DESTINATION_BRANCH = "prod",
	PR_BOT_PR_TITLE = "Merge staging to production",
} = process.env

function log(message, level = "info") {
	console[level]("[bb-pr-bot] ", message)
}

if (!BITBUCKET_REPO_SLUG || !BITBUCKET_WORKSPACE || !PR_BOT_TOKEN) {
	log("Missing environment variables: $BITBUCKET_REPO_SLUG, $BITBUCKET_WORKSPACE, $PR_BOT_TOKEN", "error")
	process.exit(1);
}


async function doFetch(path, body) {
	log(`Sending request to: ${path} with body: ${JSON.stringify(body, null, 2)}`)

	try {
		const url = `https://api.bitbucket.org/2.0/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO_SLUG}${path}`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${PR_BOT_TOKEN}`,
				"Accept": "application/json",
				"Content-Type": "application/json"
			},
			body: JSON.stringify(body)
		});

		const ret = await response.json();

		if (!response.ok) {
			log(ret, 'error')
			throw new Error(response.statusText);
		}

		log("Request successful")

		return ret;
	} catch (error) {
		log(error.message, "error")
		process.exit(1);
	}
}

const pr = await doFetch("/pullrequests", {
	"title": PR_BOT_PR_TITLE,
	"source": {
		"branch": { "name": PR_BOT_SOURCE_BRANCH }
	},
	"destination": {
		"branch": { "name": PR_BOT_DESTINATION_BRANCH }
	}
})

await doFetch(`/pullrequests/${pr.id}/merge`, { "close_source_branch": false })
