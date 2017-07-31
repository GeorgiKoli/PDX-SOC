var waterfallPlotGraph = (function() {
    var waPlot;
    var showControls = false;
	var maxYVal = Number.MIN_VALUE;
    var lastMeasDay = -1; // the last measurement day across all groups in the study

    return {
        setGraphNode: function(graphDiv) {
            waPlot = graphDiv;
        },
        setControlsVisibility: function(show) {
            showControls = show;
        },
        renderPlot: function(yAxisType, animals, groups, study) {
            // shallow array copy
            animals = animals.slice(0);
            var totalIndices = 0;

            var yAxisKey;
            if(yAxisType === 'rel-vol') {
                yAxisKey = 'percent_change_volume';
            } else if(yAxisType === 'rel-change') {
                yAxisKey = 'measurement_fold_change';
            }

            animals.sort(function(animal1, animal2) {
                return animal2[yAxisKey] - animal1[yAxisKey];
            });
            var controlGrpName = (groups[0].isControl === 1) ? groups[0].groupName : "";

            for(var i = 0; i < groups.length; i++) {
                if(lastMeasDay < groups[i].nearEndMeasDay) {
                    lastMeasDay = groups[i].nearEndMeasDay;
                }
            }

            animals.filter(function(animal) { 
                // skip indexing/plotting control group animals
                if(!showControls && animal.group_name === controlGrpName) {
                    return false;
                }
                // skip indexing/plotting animals not surviving to the last day of the study
                if(animal.end_day_measurement.measurement_day < lastMeasDay) {
                    return false;
                }

                return true;
            }).map(function(animal, i) {
                if(animal.percent_change_volume > maxYVal) {
                    maxYVal = animal.percent_change_volume;
                }
                animal.index = i;
                totalIndices++;
            });

            var traces = groups.map(function(group) {
                var grpLbl =
                    group.groupLabel + ' [days ' +
                    group.nearStartMeasDay + '-' + group.nearEndMeasDay + ']';
                return {
                    name: grpLbl,
                    x: group.animals.filter(function(animal) {
                        if(animal.end_day_measurement.measurement_day < lastMeasDay) {
                            return false;
                        }
                        return true;
                    }).map(function(animal) {return animal.index}),
                    y: group.animals.filter(function(animal) {
                        if(animal.end_day_measurement.measurement_day < lastMeasDay) {
                            return false;
                        }
                        return true;
                    }).map(function(animal) {return animal[yAxisKey]}),
                    text: group.animals.map(function(animal) {
                        var textTooltip = " ID: <b>" + animal.animal_name 
                            + "</b><br> Start Day: <b>" + animal.start_day_measurement.measurement_value
                            + "</b><br> End Day: <b>" + animal.end_day_measurement.measurement_value
                            + "</b><br> Value: <b>" + animal[yAxisKey] + "</b> ";
                        return textTooltip;
                    }),
                    type: 'bar',
                    showlegend: true,
                    hoverinfo: 'text',
                    marker: {
                        color: (group.color !== null) ? group.color : PlotLib.colors[group.index % PlotLib.colors.length]
                    }
                };
            });

            // the 50 percent reference is important for determining treatment success
            var percent50RefLine = {
                x: [-1, totalIndices],
                y: yAxisType === 'rel-vol' ? [50, 50] : [0.5, 0.5],
                xaxis: "x",
                yaxis: "y",
                type: "scatter",
                mode: "lines",
                hoverinfo: 'none',
                showlegend: false,
                line: {
                    dash: "dashdot",
                    color: "black",
                    width: 2
                }
            };
            traces.push(percent50RefLine);

            // the 90 percent reference line is important for determining treatment success
            var percent90RefLine = {
                x: [-1, totalIndices],
                y: (yAxisType === 'rel-vol' ? [90, 90] : [0.9, 0.9]),
                xaxis: "x",
                yaxis: "y",
                type: "scatter",
                mode: "lines",
				hoverinfo: 'none',
                showlegend: false,
                line: {
                    dash: "dash",
                    color: "purple",
                    width: 2
                }
            };
            traces.push(percent90RefLine);

            var yAxisTitle;
            if(yAxisType === 'rel-vol') {
                yAxisTitle = 'Change in Tumor Volume (%)';
            } else if(yAxisType === 'rel-change') {
                yAxisTitle = 'Fold Change in Tumor Volume (mm<sup>3</sup>)';
            }

            // plot titles might take more space than the available width; 
            // for such cases, the title needs to be broken on 2 lines
            var title = PlotLib.fitTextOnScreen(study.curated_study_name, waPlot.offsetWidth);
            var layout = {
                autosize: false,
                title: title,
                titlefont: PlotLib.titlefont,
                yaxis: {
                    title: yAxisTitle,
                    showline: true,
                    ticks: "outside",
                    ticksuffix: " ",
                    showticklabels: true
                },
                xaxis: {
                    title: 'Animals',
                    showticklabels: false
                },
                width: waPlot.offsetWidth,
                height: waPlot.offsetHeight,
                legend: {
                    bgcolor: 'lighgrey',	
                    xanchor: 'right',
                    yanchor: 'top'
                },
                bargap: 0.1,
                annotations: [
                    {
                        x: totalIndices,
                        y: (yAxisType === 'rel-vol' ? 50 : 0.5),
                        xref: "x",
                        yref: "y",
                        text: "50%",
                        showarrow: true,
                        arrowhead: 2,
                        ax: totalIndices,
                        ay: (maxYVal > 200 ? -20 : 60)
                    },
					{
                        x: totalIndices,
                        y: (yAxisType === 'rel-vol' ? 90 : 0.9),
                        xref: "x",
                        yref: "y",
                        text: "90%",
                        showarrow: true,
                        arrowhead: 2,
                        ax: totalIndices,
                        ay: (maxYVal > 200 ? -60 : 20)
                    }
                ]
            };

            Plotly.newPlot(waPlot, traces, layout, PlotLib.modebar);

            if(!showControls) {
                Plotly.deleteTraces(waPlot, [0]);
            } 
        }
    };
}());