/* eslint-disable no-undef */

document.addEventListener("DOMContentLoaded", () => {
	document.body.innerHTML += `<div class="swagger-ui" style="display: flex; flex-flow: column nowrap; align-items: center;">
		<p style="margin-bottom: 4px">
			This website was made using the
			<a
				href="https://tsoa-community.github.io/docs/"
				target="_blank"
				rel="noopener noreferrer"
			>tsoa</a> framework. View the source
			<a
				href="https://github.com/Faithful-Resource-Pack/API"
				target="_blank"
				rel="noopener noreferrer"
			>here</a>!
		</p>
		<p style="margin-top: 4px; margin-bottom: 24px">© ${new Date().getFullYear()} Faithful Resource Pack</p>
	</div>`;

	// less terrible responsiveness
	document.head.innerHTML += `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`;
});
