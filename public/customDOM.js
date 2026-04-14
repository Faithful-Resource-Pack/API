/* eslint-disable no-undef */

document.addEventListener("DOMContentLoaded", () => {
	document.body.innerHTML += `
		<div class="swagger-ui footer-container">
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
		</div>
	`;

	// less terrible responsiveness
	document.head.innerHTML += `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`;

	// add to top button
	document.body.innerHTML += `
		<button
			type="button"
			class="go-up-btn hide"
			onclick="window.scrollTo({ top: 0, behavior: 'smooth' })"
			title="Return to page start"
		>
			⌃
		</button>
	`;

	// there is almost certainly a more efficient way to do this
	window.addEventListener("scroll", () => {
		const btn = document.querySelector(".go-up-btn");
		if (window.scrollY > 500) btn.classList.remove("hide");
		else btn.classList.add("hide");
	});
});
