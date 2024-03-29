const Template = require("../../src/lib/Template");

const storage = require("@macaw-email/storage-fs")();
storage.setOptions({
  templatesDirectory: "./tests/emails"
});

const defaultOptions = {
  layoutsDirectory: "layouts",
  storage: storage
};

test("template without frontmatter uses default layout", async () => {
  const template = await Template.load(
    "example-no-frontmatter.md",
    defaultOptions,
    {}
  );

  expect(template.layoutFilePath).toEqual("layouts/default.mjml");
});

test("template can specify custom layout", async () => {
  const template = await Template.load(
    "example-custom-layout.md",
    defaultOptions,
    {}
  );

  expect(template.layoutFilePath).toEqual("layouts/custom.mjml");
});

test("template throws error if file doesn't exist", async () => {
  await expect(
    Template.load("random-file.md", defaultOptions, {})
  ).rejects.toThrow(/no such file/i);
});

test("template renders with vars", async () => {
  const template = await Template.load(
    "example-no-frontmatter.md",
    defaultOptions,
    { name: "John" }
  );

  const html = template.render();

  expect(html).toContain("Hello, John!");
});

test("template renders frontmatter with twig", async () => {
  const template = await Template.load(
    "example-twig-frontmatter.md",
    defaultOptions,
    { name: "Bob" }
  );

  expect(template.data.subject).toEqual("Hello Bob!");
});

test("template renders frontmatter with twig (complex)", async () => {
  const template = await Template.load(
    "example-twig-frontmatter-2.md",
    defaultOptions,
    { email: "bob@andrews.com" }
  );

  expect(template.data.fromName).toEqual("Bob");
  expect(template.data.fromEmail).toEqual("bob@andrews.com");
});

test("template renders frontmatter with twig (defaults)", async () => {
  const template = await Template.load(
    "example-twig-frontmatter-2.md",
    defaultOptions,
    {}
  );

  expect(template.data.fromName).toEqual("Mark");
  expect(template.data.fromEmail).toEqual("mark@example.com");
});

test("template renders with partial", async () => {
  const template = await Template.load("example-partial.md", defaultOptions, {
    name: "Peter"
  });

  const html = template.render();

  expect(html).toContain("Hello, Peter");
});

test("template renders with partial in frontmatter", async () => {
  const template = await Template.load(
    "example-twig-frontmatter-3.md",
    defaultOptions,
    {
      name: "Peter"
    }
  );

  expect(template.data.fromEmail).toEqual("peter@acme.inc");

  const template2 = await Template.load(
    "example-twig-frontmatter-3.md",
    defaultOptions,
    {}
  );

  expect(template2.data.fromEmail).toEqual("noreply@acme.inc");
});

test("template renders layout with vars", async () => {
  const template = await Template.load(
    "example-twig-subject.md",
    defaultOptions,
    { name: "John" }
  );

  const html = template.render();

  expect(html).toContain("Twig, world!");
});

test("template gracefully handles missing vars", async () => {
  // TODO: not sure if I actually agree with this behaviour
  const template = await Template.load(
    "example-twig-subject.md",
    defaultOptions,
    {}
  );

  const html = template.render();

  expect(html).toContain("Twig, world!");
  expect(html).toContain("Hello, !");
});

test("template send calls provider send function", async () => {
  const mockSend = jest.fn();
  const template = await Template.load(
    "example-no-frontmatter.md",
    {
      ...defaultOptions,
      provider: {
        send: mockSend
      }
    },
    { name: "John" }
  );

  const html = template.render();
  const to = {
    name: "John",
    email: "john@example.com"
  };

  template.send({
    to
  });

  expect(mockSend).toBeCalledTimes(1);
  expect(mockSend).toBeCalledWith({ html, to, data: template.data });
});

test("template throws error on invalid mjml", async () => {
  const template = await Template.load(
    "example-invalid-mjml.md",
    defaultOptions,
    { name: "John" }
  );

  expect(template.data.layout).toEqual("invalid");
  expect(() => template.render()).toThrow(/invalid mjml/i);
});

test("template send throws error if no provider set", async () => {
  const template = await Template.load(
    "example-no-frontmatter.md",
    defaultOptions,
    { name: "John" }
  );

  const callSend = () => {
    template.send({
      to: {
        name: "John",
        email: "john@example.com"
      }
    });
  };

  expect(callSend).toThrow(/no provider set/i);
});

test("template with invalid frontmatter uses default layout", async () => {
  const template = await Template.load(
    "example-invalid-frontmatter.md",
    defaultOptions,
    {}
  );

  expect(template.layoutFilePath).toEqual("layouts/default.mjml");
});
