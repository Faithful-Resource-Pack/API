/* eslint-disable no-undef */

// NOTE: most content is loaded dynamically so it can't be directly accessed here
document.addEventListener("DOMContentLoaded", () => {
	// less terrible responsiveness
	document.head.innerHTML += `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`;

	// thankfully since footer is at bottom of page we can just directly use body.innerHTML
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
			<p style="margin-top: 4px; margin-bottom: 24px">
				© ${new Date().getFullYear()} Faithful Resource Pack
			</p>
		</div>
	`;

	// go to top button
	document.body.innerHTML += `
		<button
			type="button"
			id="go-up-btn"
			class="hide"
			onclick="window.scrollTo({ top: 0, behavior: 'smooth' })"
			title="Return to page start"
		>
			⌃
		</button>
	`;

	const goUpBtn = document.getElementById("go-up-btn");

	// there is almost certainly a more efficient way to do this
	window.addEventListener("scroll", () =>
		scrollY > 500 ? goUpBtn.classList.remove("hide") : goUpBtn.classList.add("hide"),
	);
});
