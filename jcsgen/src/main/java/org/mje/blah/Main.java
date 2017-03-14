package org.mje.blah;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import javax.json.*;
import org.apache.commons.cli.*;

public class Main {
    final static String PROGRAM_NAME = "jcsgen";
    final static String DESCRIPTION = "JCStress harness generator";
    final static String CLASS_NAME_SUFFIX = "StressTests";

    static Options getOptions() {
        Options options = new Options();

        options.addOption(Option.builder().longOpt("help")
            .desc("print this message")
            .build());

        options.addOption(Option.builder().longOpt("path")
            .desc("path to output files (required)")
            .hasArg()
            .argName("PATH")
            .build());

        return options;
    }

    public static void main(String... args) {
        CommandLine line;

        try {
            line = new DefaultParser().parse(getOptions(), args);
        } catch (ParseException e) {
            line = null;
        }

        if (line == null
                || line.hasOption("help")
                || line.getArgs().length != 1
                || !line.hasOption("path")) {

            new HelpFormatter().printHelp(
                PROGRAM_NAME + " [options] <HARNESS-SPEC-FILE>.json",
                DESCRIPTION + System.lineSeparator() + "options:",
                getOptions(),
                System.lineSeparator());
            return;
        }

        String file = line.getArgs()[0];
        int status = 0;

        try {
            Map<String,Collection<Harness>> harnesses = new HashMap<>();;
            try (JsonReader reader = Json.createReader(new FileReader(file))) {
                for (Harness h : HarnessFactory.fromJson(reader.read())) {
                    String className = h.getTargetClass().getName();
                    if (!harnesses.containsKey(className))
                        harnesses.put(className, new LinkedList<>());
                    harnesses.get(className).add(h);
                }
            }

            for (String className : harnesses.keySet()) {
                String testClassName = className + CLASS_NAME_SUFFIX;

                Path path = Paths.get(
                    line.getOptionValue("path"),
                    testClassName.replace(".", "/") + ".java"
                );

                path.toFile().getParentFile().mkdirs();

                try (PrintWriter out = new PrintWriter(path.toFile())) {
                    out.println(new JCStressHarnessPrinter(
                        testClassName, harnesses.get(className)).toString());
                }
            }

        } catch (Exception e) {
            System.err.println("Caught " + e + " while processing " + file);
            status = 1;
        }

        System.exit(status);
    }
}