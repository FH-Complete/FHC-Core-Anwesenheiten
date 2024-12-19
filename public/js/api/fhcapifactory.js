import Kontrolle from "./kontrolle.js";
import Profil from "./profil.js";
import Info from "./info.js";
import Administration from "./administration.js";
import Stats from "./stats";

export default {
	factory: {
		"Kontrolle": Kontrolle,
		"Profil": Profil,
		"Info": Info,
		"Administration": Administration,
		"Stats": Stats
	}
};