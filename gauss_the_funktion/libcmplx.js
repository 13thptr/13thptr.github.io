puissance=(z,r)=>{
	//Renvoie z^r avec z un complexe et r un entier positif (TODO:r n'importe quel nombre décimal)
	let tmp=z;
	for(let k=1;k<r;k++){
		tmp=mult(z,tmp)
	}
	return tmp;
}


puissance2=(z,r)=>{
	//Comparer la performance avec "puissance"
	return mult(Math.exp(r*z[0]),e(r*z[1]));
}

moduleCarre=z=>{
	let r = z[0];
	let i = z[1]; 
	return r**2+i**2;
}
module=z=>{
	return Math.sqrt(moduleCarre(z));
}
argument=z=>{
	return Math.atan2(z[1],z[0]);
}
mult=(z1,z2)=>{
	let x1 = z1[0],x2 = z2[0];
	let y1 = z1[1],y2 = z2[1];
	return [(x1*x2)-(y1*y2),(x1*y2+y1*x2)];
}
ajoute=(z1,z2)=>{
	let r1=z1[0],r2=z2[0];
	let i1=z1[1],i2=z2[1];
	return [r1+r2,i1+i2];
}
//Exponentielle complexe (formule d'Euler)
function e(angle){
	return [Math.cos(angle),Math.sin(angle)];
}
function TFD(fonction,N){
	let nombre_echantillons=fonction.length;
	let liste_coefs=[];
	for(let n=-N;n<N;n++){
		let cn=[0,0];
		for(let i=0;i<nombre_echantillons;i++){
			cn=ajoute(cn,mult(fonction[i],e(-2*Math.PI*i*n/nombre_echantillons)));
		}
		let l=[cn,n];
		liste_coefs.push(l);
	}
	return liste_coefs;
}



