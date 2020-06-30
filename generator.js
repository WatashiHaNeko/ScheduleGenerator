const d3 = require("d3");
const fs = require("fs");
const jsdom = require("jsdom");
const path = require("path");

const main = async () => {
  const width = 400;
  const height = 400;

  const files = await listFiles().catch((error) => {
    console.error({ error });

    return [];
  });

  for (const file of files) {
    const rawData = await readJSON(file).catch((error) => {
      console.error({ error });

      return null;
    });

    if (!rawData) {
      continue;
    }

    const validatedData = validateData(rawData);

    const convertedData = convertData(validatedData);

    const filledData = fillData(convertedData);

    const dom = new jsdom.JSDOM();

    const body = dom.window.document.querySelector("body");

    const color = d3.scaleOrdinal()
        .range([
          "#007aff",
          "#34c759",
          "#5856d6",
          "#ff9500",
          "#ff2d55",
          "#af52de",
          "#ff3b30",
          "#5ac8fa",
          "#ffcc00",
        ]);

    const svg = d3.select(body)
        .append("svg:svg")
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .attr("viewBox", ([0, 0, width, height]).join(" "))
        .attr("width", width)
        .attr("height", height);

    const pie = d3.pie()
        .value((d) => (d.duration))
        .sort(null);

    const chart = svg
        .append("svg:g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`)
        .selectAll(".pie")
        .data(pie(filledData))
        .enter()
        .append("svg:g")
        .attr("class", "pie");

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(Math.max(width, height) / 2);

    chart
        .append("path")
        .attr("d", arc)
        .attr("fill", (d) => {
          if (d.data.name) {
            return color(d.index);
          }

          return "#8e8e93";
        })
        .attr("opacity", 0.8);

    const text = d3.arc()
        .innerRadius(100)
        .outerRadius(100);

    chart
        .append("text")
        .attr("fill", "black")
        .attr("transform", (d) => (`translate(${text.centroid(d)})`))
        .attr("dy", 5)
        .attr("text-anchor", "middle")
        .text((d) => (d.data.name));

    await writeSVG(file, `<?xml version="1.0"?>${body.innerHTML}`).catch((error) => {
      console.error({ error });
    });
  }
};

const listFiles = async () => new Promise((resolve, reject) => {
  fs.readdir(path.join(__dirname, "data"), (err, files) => {
    if (err) {
      return reject(err);
    }

    resolve(files.filter((file) => ((/\.json$/).test(file))));
  });
});

const readJSON = async (file) => new Promise((resolve, reject) => {
  fs.readFile(path.join(__dirname, "data", file), {
    encoding: "utf8",
  }, (err, data) => {
    if (err) {
      return reject(err);
    }

    try {
      const json = JSON.parse(data);

      resolve(json);
    } catch (error) {
      reject(error);
    }
  });
});

const writeSVG = async (file, data) => new Promise((resolve, reject) => {
  fs.mkdir(path.join(__dirname, "svg"), {
    recursive: true,
  }, (err) => {
    if (err) {
      return reject(err);
    }

    fs.writeFile(path.join(__dirname, "svg", file.replace(/\.json$/, ".svg")), data, (err) => {
      if (err) {
        return reject(err);
      }

      resolve();
    });
  });
});

const validateData = (data) => {
  return data.filter((datum) => {
    if (!datum.name) {
      return false;
    }

    if (!datum.from || !(/^\d{2}\:\d{2}$/).test(datum.from)) {
      return false;
    }

    if (!datum.to || !(/^\d{2}\:\d{2}$/).test(datum.to)) {
      return false;
    }

    return true;
  });
};

const convertData = (data) => {
  let minutePointer = 0;

  return data.map((datum) => {
    const hmPattern = /^(?<hour>\d{2})\:(?<minute>\d{2})$/;

    const fromMatched = datum.from.match(hmPattern);
    const toMatched = datum.to.match(hmPattern);

    const from = Number(fromMatched.groups.hour) * 60 + Number(fromMatched.groups.minute);
    const to = Number(toMatched.groups.hour) * 60 + Number(toMatched.groups.minute);

    const duration = to - from;

    return {
      name: datum.name,
      from: from,
      duration: to - from,
    };
  }).sort((a, b) => {
    if (a.from > b.from) {
      return 1;
    } else if (a.from < b.from) {
      return -1;
    }

    return 0;
  }).filter((datum) => {
    if (datum.from < minutePointer) {
      return false;
    }

    minutePointer = datum.from + datum.duration;

    return true;
  });
};

const fillData = (data) => {
  let minutePointer = 0;
  let filledData = [];

  for (const datum of data) {
    if (datum.from > minutePointer) {
      filledData.push({
        name: null,
        from: minutePointer,
        duration: datum.from - minutePointer,
      });
    }

    minutePointer = datum.from + datum.duration;

    filledData.push(datum);
  }

  if (minutePointer < 1440) {
    filledData.push({
      name: null,
      from: minutePointer,
      duration: 1440 - minutePointer,
    });
  }

  return filledData;
};

main();

