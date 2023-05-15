/*
			2019 Mehdi S.
			Algorithme différent: au lieu de calculer le coefficient binomial,
			on utilise le (corollaire du) théorème de Lucas:https://fr.wikipedia.org/wiki/Th%C3%A9or%C3%A8me_de_Lucas
			Cet algorithme est très efficace puisqu'on ne perd pas de temps à calculer et stocker 
			les coefficients de quelque manière que ce soit.
		*/
		const c = document.getElementById("c");
		const ctx = c.getContext("2d");
		const btn = document.getElementById("btn");
		const LIGNES = c.width;
		const COLONNES = c.height;
		const COTE_PIXEL = 1;

		const mslider = document.getElementById("modulo");
		const p = document.getElementById("txt");

		let BASE = 2;
		let check1 = document.getElementById("oui");
		let check2 = document.getElementById("non");
		check1.checked = false;


		mslider.oninput = g = () => {
			BASE = mslider.value, p.innerHTML = "Triangle modulo " + BASE;
		}
		/*
			La fonction suivante  "convertit" le nombre u en une chaîne de caractères qui représente u en base v
			puis transforme cette chaîne en liste/tableau et redonne à chacun des éléments de ce tableau le
			type "nombre".
		*/
		let f = (u, v) => u.toString(v).split``.map(e => Number(e));

		/*
			Wikipédia:
			«Un coefficient binomial (mn)est divisible par un nombre premier p si et seulement si 
			au moins un chiffre de n en base p est plus grand
			que le chiffre correspondant de m. 
			Ce corollaire est un cas particulier d'un théorème de Kummer.» 

			(Renvoie "vrai"(true) si le coefficient binomial fourni par les arguments colonne et ligne est divisible
			par p,"faux" (false)sinon)
		*/

		function moduloLucas(ligne, colonne, p) {

			if (colonne > ligne) {
				return true;
			}
			//On développe m et n en base p
			let m = f(ligne, p);
			let n = f(colonne, p);
			return compare(m, n);

		}
		//Si un chiffre de tab2 est supérieur au chiffre de tab1 correspondant,on renvoie vrai, et faux sinon.
		function compare(tab1, tab2) {

			if (tab2.length > tab1.length) {
				console.log("Il y a un problème avec la vérification dans la fonction moduloLucas");
			}
			while (tab1.length > tab2.length) {
				/*
				On ajoute des zéros au début afin que les tableaux qui représentent la décomposition du coefficient binomial
				soient de même longueur
				*/
				tab2 = tab2.reverse();//push ajoute un élément à la fin du tableau donc on inverse le tableau
				tab2.push(0);//On ajoute le 0
				tab2 = tab2.reverse();//Et on remet le tableau à l'endroit.
			}

			for (let k = 0; k < tab1.length; k++) {
				if (tab2[k] > tab1[k]) {
					return true;
				}
			}
			return false;
		}


		function Generer() {
			ctx.clearRect(0, 0, c.width, c.height);
			//Dans une version antérieure, j'avais mis le if à l'extérieur, ce qui évite de faire le test à chaque tour.
			//(ou un produit dans la version présente avec FLAG)
			//Mais le code était deux fois plus long (2 doubles boucles)pour un gain de performance négligeable. 
			//Peut-on concilier efficacité et lisibilité ici ?
			let FLAG=0;
			if(check1.checked){
				FLAG=1;
			}
			for (X = 0; X < COLONNES; X++) {
				for (Y = 0; Y < LIGNES; Y++) {
					if (!moduloLucas(Y, X, BASE)) {
						ctx.fillRect(X * COTE_PIXEL-Y*COTE_PIXEL/2*FLAG+COLONNES/2*FLAG, Y * COTE_PIXEL, COTE_PIXEL, COTE_PIXEL);
					}
				}
			}
		}
		btn.onclick = Generer;
		Generer();

