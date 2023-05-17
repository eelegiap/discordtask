d3.queue()
    .defer(d3.json, "data/message_counts.json")
    .defer(d3.json, "data/join_counts.json")
    .defer(d3.json, "data/atlas_counts.json")
    .defer(d3.json, "data/atlas_leaderboard_data.json")
    .defer(d3.json, "data/gpt4all_leaderboard_data.json")
    .defer(d3.json, "data/top_posts.json")
    .awaitAll(function (error, files) {
        if (error) throw error;

        var gptchatdata = files[0]
        var joins = files[1]
        var atlaschatdata = files[2]
        var atlaslboard = files[3]
        var gpt4alllboard = files[4]
        var toppostdata = files[5]

        function drawLeaderboard(data) {
            // Remove the existing rows
            d3.select("#leaderboard").selectAll("tr").remove();

            // Select the table body and bind the new data to it
            var rows = d3.select("#leaderboard").selectAll("tr").data(data);

            // Create new rows for each item in the data
            var rowsEnter = rows.enter().append("tr");

            // Create cells for rank, username, and messages sent
            rowsEnter.append("td").text((d, i) => i + 1); // Rank is index + 1
            rowsEnter.append("td").text(d => d.username);
            rowsEnter.append("td").text(d => d.messagesSent);
        }

        // Add top posts table
        function drawTopPosts(data) {
            // Remove the existing rows
            d3.select("#topPosts").selectAll("tr").remove();

            // Select the table body and bind the new data to it
            var rows = d3.select("#topPosts").selectAll("tr").data(data);

            // Create new rows for each item in the data
            var rowsEnter = rows.enter().append("tr");

            // Create cells for rank, username, post and votes
            rowsEnter.append("td").text((d, i) => i + 1); // Rank is index + 1
            rowsEnter.append("td").text(d => d.username);
            rowsEnter.append("td").text(d => d.post);
            rowsEnter.append("td").text(d => d.votes);
        }

        // Initially draw the table with the top posts data
        drawTopPosts(toppostdata.gpt4all);


        var currentData = gptchatdata;

        var earliestDate = d3.min([d3.min(gptchatdata.Daily, d => d.time), d3.min(joins.Daily, d => d.time)]);
        var latestDate = d3.max([d3.max(gptchatdata.Daily, d => d.time), d3.max(joins.Daily, d => d.time)]);
        var dateRange = [new Date(earliestDate), new Date(latestDate)]

        const body = document.querySelector('body')
        body.onresize = function () {
            const lineSVG = document.querySelector('#svg-line1')
            if (lineSVG != null) {
                lineSVG.remove()
                drawLineChart(gptchatdata.Daily, 'day', 'line1', 'Messages sent', dateRange);
                drawLineChart(joins.Daily, 'day', 'line2', 'New members', dateRange);
            }
        }

        // Create buttons for user to select timeframe
        d3.select("#daily").on("click", function () {

            drawLineChart(getCurrentData().Daily, 'day', 'line1', 'Messages sent', dateRange);
            drawLineChart(joins.Daily, 'day', 'line2', 'New members', dateRange);
        });
        d3.select("#weekly").on("click", function () {
            drawLineChart(getCurrentData().Weekly, 'week', 'line1', 'Messages sent', dateRange);
            drawLineChart(joins.Weekly, 'week', 'line2', 'New members', dateRange);
        });
        d3.select("#monthly").on("click", function () {
            drawLineChart(getCurrentData().Monthly, 'month', 'line1', 'Messages sent', dateRange);
            drawLineChart(joins.Monthly, 'month', 'line2', 'New members', dateRange);
        });

        // Define the div for the tooltip
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        // Create dropdown for user to select dataset
        var select = d3.select('#dropdown')
            .append('select')
            .attr('class', 'select')
            .on('change', onchange)

        var options = select
            .selectAll('option')
            .data(['GPT4all-chat channel', 'Atlas-chat channel']).enter()
            .append('option')
            .text(function (d) { return d; });

        function onchange() {
            var selectValue = d3.select('select').property('value')
            d3.selectAll('.tabletitle').text(selectValue)
            if (selectValue === 'GPT4all-chat channel') {
                currentData = gptchatdata;
                drawLeaderboard(gpt4alllboard);
                drawTopPosts(toppostdata.gpt4all);
            } else {
                currentData = atlaschatdata;
                drawLeaderboard(atlaslboard);
                drawTopPosts(toppostdata.atlas);
            }
            drawLineChart(currentData.Daily, 'day', 'line1', 'Messages sent', dateRange);
        };
        function getCurrentData() {
            var selectValue = d3.select('select').property('value')
            if (selectValue === 'GPT4all-chat channel') {
                return gptchatdata;
            } else {
                return atlaschatdata;
            }

        }

        drawLeaderboard(gpt4alllboard);
        d3.selectAll('.tabletitle').text(d3.select('select').property('value'))
        // Draw the line chart initially with daily data
        drawLineChart(currentData.Daily, 'day', 'line1', 'Messages sent', dateRange);
        drawLineChart(joins.Daily, 'day', 'line2', 'New members', dateRange);

        function drawLineChart(data, timePeriod, chartID, dType, dateRange) {
            d3.select("#svg-" + chartID).remove();
            const area = document.querySelector('#' + chartID)
            const margin = { y: 65, x: 100 },
                width = area.offsetWidth - (2 * margin.x),
                height = area.offsetHeight - (2 * margin.y);

            const svg = d3.select(area).append("svg")
            svg.attr("width", width + (2 * margin.x))
                .attr("height", height + (2 * margin.y))
                .attr('id', 'svg-' + chartID)
            const chart = svg.append('g')
                .attr('transform', `translate(${margin.x},${margin.y})`)

            // Convert 'time' to JavaScript date objects
            data.forEach(function (d) {
                d.time = new Date(d.time);
            });

            // Create scales

            const xScale = d3.scaleTime().range([0, width]).domain(dateRange);
            const yScale = d3.scaleLinear().range([height, 0]).domain([0, d3.max(data, d => d.count)]);

            chart.append('g')
                .attr('class', 'axis')
                .call(d3.axisLeft(yScale))

            chart.append('g')
                .attr('class', 'axis')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(xScale))

            //Draw grid
            chart.append('g')
                .attr('class', 'grid-hline')
                .call(d3.axisLeft().scale(yScale).tickSize(-width, 0, 0).tickFormat(''))

            //End Draw grid
            var channelName;
            if (dType == 'New members') {
                channelName = 'Nomic Discord'
            } else {
                channelName = d3.select('select').property('value')
            }

            d3.selectAll('.timePeriod').text(timePeriod)

            //End Top Title

            //x Axis Title
            svg.append('text')
                .attr('x', (width / 2) + margin.x)
                .attr('y', (margin.y * 2))
                .attr('transform', `translate(0,${height - (margin.y / 4)})`)
                .attr('class', 'title')
                .text('')
            //End x axis title

            //y Axis Title
            svg.append('text')
                .attr('class', 'title')
                .attr('x', -(height / 2) - margin.y)
                .attr('y', margin.x / 2.4)
                .attr('transform', 'rotate(-90)')
                .text(`# of ${dType.toLowerCase()} per period`)
            //End y Axis Title

            const line = d3.line()
                .x(function (d, i) { return xScale(d.time) })
                .y(function (d, i) { return yScale(d.count) })
                .curve(d3.curveMonotoneX)

            chart.append('path')
                .datum(data)
                .attr('class', 'line')
                .attr('d', line)

            var formatTime = d3.timeFormat("%b %d, %Y");
            // Add dots on the line for each relevant tick
            chart.selectAll(".dot")
                .data(data)
                .enter().append("circle") // Use enter() to create new dots for each data point
                .attr("class", "dot") // Assign a class for styling
                .attr("cx", function (d) { return xScale(d.time) })
                .attr("cy", function (d) { return yScale(d.count) })
                .attr("r", 5) // radius of circle
                .style('fill', '#EFF5FD')
                .style('stroke', '#3862bb')
                .on("mouseover", function (event, d) {
                    // Show the tooltip on mouseover
                    d3.select(this).transition().attr('r',8)
                    var tooltipID
                    if (dType == 'New members') {
                        tooltipID = '#tooltip2'
                    } else {
                        tooltipID = '#tooltip1'
                    }
                    d3.select(tooltipID).html(`${event.count} ${dType.toLowerCase()} on ${formatTime(event.time)}`)
                })

                .on("mouseout", function (d) {
                    d3.select(this).transition().attr('r',5)
                    // Hide the tooltip on mouseout
                    var tooltipID
                    if (dType == 'New members') {
                        tooltipID = '#tooltip2'
                    } else {
                        tooltipID = '#tooltip1'
                    }
                    d3.select(tooltipID).html('')
                });

        }

    })
