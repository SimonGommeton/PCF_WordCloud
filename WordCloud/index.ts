import { IInputs, IOutputs } from "./generated/ManifestTypes";
import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi;
type DataSet = ComponentFramework.PropertyTypes.DataSet;
import "core-js";
import * as am4core from "@amcharts/amcharts4/core";
import * as am4plugins_wordCloud from "@amcharts/amcharts4/plugins/wordCloud";
import am4themes_animated from "@amcharts/amcharts4/themes/animated";
import am4themes_material from "@amcharts/amcharts4/themes/material";

export class WordCloud implements ComponentFramework.StandardControl<IInputs, IOutputs> {

	private _container: HTMLDivElement;
	private _context: ComponentFramework.Context<IInputs>;

	private stop_words: string[];
	private max_number_words: number;
	private nGram: number;
	private colorset: string[];

	private chart: am4plugins_wordCloud.WordCloud;
	private series: am4plugins_wordCloud.WordCloudSeries;

	/**
	 * Empty constructor.
	 */
	constructor() {

	}

	/**
	 * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
	 * Data-set values are not initialized here, use updateView.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
	 * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
	 * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
	 * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
	 */
	public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement) {
		//  PowerApps Component Framework required parameters
		this._context = context;
		this._container = container;
		// Global variables
		this.nGram = Math.min(Math.max(context.parameters.nGram.raw as number,1),5);
		this.max_number_words = Math.min(Math.max(context.parameters.max_number_words.raw as number,1),40);

		var chartdiv = document.createElement("div");
		this._container.appendChild(chartdiv);

		chartdiv.setAttribute("id", "chartdiv-css");

		this.chart = am4core.create(chartdiv, am4plugins_wordCloud.WordCloud);
		this.series = this.chart.series.push(new am4plugins_wordCloud.WordCloudSeries());

		am4core.useTheme(am4themes_animated);
		am4core.useTheme(am4themes_material);

		this.stop_words = ["a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at", "be", "because", "been", "before",
			"being", "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
			"each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers",
			"herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me",
			"more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own",
			"same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
			"then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
			"wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom",
			"why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves", "But", "And"];

			this.colorset = ["#125a7f", "#3f8a9c", "#2b4c6b"];
			//this.colorset = context.parameters.colorlist.parse(" ")
	}

	/**
	 * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
	 */
	public updateView(context: ComponentFramework.Context<IInputs>): void {
		this._context = context;
		let dataset = context.parameters.datasource;
		
		// Wait for dataset loading and trigger loadNextPage() if there is more
		if (dataset.loading) {
			return;
		}

		if (dataset.paging.hasNextPage) {
			dataset.paging.loadNextPage();
			return;
		}

		var InputList: any[] = []
		for (let recordId of dataset.sortedRecordIds) {
			let currentId = dataset.records[recordId]

			var targetfields = currentId.getValue("targetfield");

			var cleanText = this.CleanText(targetfields as string); 

			InputList.push(cleanText);
		}

		//let inputText: string = InputList.join(" ");

		
		var nGramDico = this.GetNGram(InputList, this.nGram);
		var nGramSmallDico = this.SmallDictionary(nGramDico);
		this.ConfigureSeries(nGramSmallDico);

	}

	/**
	* CleanText --> Uses regex to withdraw special chars, splits to seperate and pushes word to []
	*/
	public CleanText(txt: string): string[] {
		var res: string[] = []

		txt = txt.replace(/[&\/\\#,+()$~%@.'":*?<>{}]/g, '');
		var words = Array.from(txt.split(/\s+/));

		for (var i = 0; i < words.length; i++) {
			if (this.stop_words.indexOf(words[i]) == -1) {
				res.push(words[i]);
			}
		}

		return res;
	}

	/** 
	* GetNGram --> Returns a Map object with words of size n as keys and words occurrences as values.
	*/
	public GetNGram(txt: string[][], n: number): Map<string, number> {
		let wordico = new Map();
		var tmp = "";

		// Parcours tous les champs récupérés sur les records du dataset
		for(var t = 0; t < txt.length; t++) {
			// Parcours tous les mots du champs 
			for (var i = 0; i < txt[t].length - n + 1; i++) {
				tmp = "";
				// Récupère les n éléments du n Gram
				for (var j = 0; j < n; j++) {
					tmp = tmp.concat(txt[t][i + j], " ");
				};
				tmp = tmp.substring(0, tmp.length - 1);
				// Compte les occurences du n Gram
				if (wordico.has(tmp)) {
					wordico.set(tmp, wordico.get(tmp) + 1);
				}
				else {
					wordico.set(tmp, 1);
				}
			}
		}

		return wordico;
	}

	/** 
	*	SmallDictionary --> Returns as many object as defined by the 'max_number_words' variable through a Json object
	*/
	public SmallDictionary(dic: Map<string, number>): any[] {
		var i = 0;
		var j = 0;
		var min_occurence = new Array(this.max_number_words).fill(0)
		let wordicosmall = new Map<string, number>();
		let jsonObject: any = [];

		dic.forEach((value, key, map) => {
			if (i < this.max_number_words) {
				min_occurence[i] = value;
			}
			else {
				j = min_occurence.indexOf(Math.min(...min_occurence));
				if (value > min_occurence[j]) {
					min_occurence[j] == value;
				}
			}
			i++;
		});

		var last_occurence_value = Math.min(...min_occurence);
		i = 0;
		dic.forEach((value, key, map) => {
			if (i < this.max_number_words) {
				if (value >= last_occurence_value) {
					wordicosmall.set(key, value);
					i++;
				}
			}
		});

		wordicosmall.forEach((value, key, map) => {
			jsonObject.push({ "tag": key, "weight": value, "color": am4core.color(this.colorset[~~(Math.random() * this.colorset.length)]) });
		});

		return jsonObject;
	}

	/** 
	* Provides Json to Series Data and configure
	*/
	public ConfigureSeries(jsonObject: any[]): void {
		// Send smaller Dictionary to am4 WordCloud series
		this.series.data = jsonObject;

		// Define series
		// DataFields
		this.series.dataFields.word = "tag";
		this.series.dataFields.value = "weight";

		// Fonts
		this.series.minFontSize = 35;
		this.series.maxFontSize = 90;

		// Tooltips
		//this.series.labels.template.tooltipText = "[bold]{value}[/]";
		//this.series.labels.template.url = "https://docs.microsoft.com/en-us/search/?search={word}";
		//this.series.labels.template.urlTarget = "_blank";

		//Colors
		this.series.colors = new am4core.ColorSet();
		this.series.colors.passOptions = {};
		this.series.labels.template.propertyFields.fill = "color";

		//Rotation Threshold
		//this.series.rotationThreshold = 0;
	}

	/** 
	 * It is called by the framework prior to a control receiving new data. 
	 * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
	 */
	public getOutputs(): IOutputs {
		return {};
	}

	/** 
	 * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
	 * i.e. cancelling any pending remote calls, removing listeners, etc.
	 */
	public destroy(): void {
	}

}



